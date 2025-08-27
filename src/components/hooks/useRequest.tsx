'use client'

import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";

// ========== TYPE DEFINITIONS ==========
type Payload<K extends string | number | symbol = string, V = any> = {
    [key in K]: V;
};

type RequestError = {
    type: string;
    message: string;
    status?: number;
};

type RequestState<T = any> = {
    pending: boolean;
    error: RequestError | null;
    data: T | null;
};

type FieldErrors<B, Q> = {
    body?: { [key in keyof B]?: string };
    queryParams?: { [key in keyof Q]?: string };
};

type ParamsFieldErrors<P> = {
    params?: { [key in keyof P]?: string };
};

// HTTP-specific props
type HTTPProps<T = any, B extends Payload = Payload, Q extends Payload = Payload> = {
    endpoint: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: B;
    queryParams?: Q;
    headers?: Record<string, string>;
    validator?: z.ZodTypeAny | ((data: { body?: B; queryParams?: Q }) => boolean);
    onValidate?: (data: { body?: B; queryParams?: Q }) => boolean;
    onSuccess?: (result: T) => void;
    onError?: (error: RequestError) => void;
    onComplete?: () => void;
};

// Server Action-specific props
type ActionProps<T = any, P extends Payload = Payload> = {
    action: (params: P) => Promise<T>;
    params?: P;
    validator?: z.ZodTypeAny | ((data: P) => boolean);
    onValidate?: (data: P) => boolean;
    onSuccess?: (result: T) => void;
    onError?: (error: RequestError) => void;
    onComplete?: () => void;
};

// Union type for auto-detection
type UseRequestProps<T = any, B extends Payload = Payload, Q extends Payload = Payload, P extends Payload = Payload> =
    | (HTTPProps<T, B, Q> & { action?: never })
    | (ActionProps<T, P> & { endpoint?: never; method?: never; body?: never; queryParams?: never; headers?: never });

type UseRequestReturn<T, B, Q, P> = RequestState<T> & {
    isValid: boolean;
    fieldErrors: FieldErrors<B, Q> | ParamsFieldErrors<P>;
    send: () => Promise<T>;
    clearError: () => void;
    clearData: () => void;
};

// ========== ERROR HANDLING ==========
class HttpError extends Error {
    status: number;

    constructor(name: string, message: string, status: number) {
        super(message);
        this.name = name;
        this.status = status;
    }
}

const HTTP_ERROR_MAP: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    409: "Conflict",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
};

const getHttpErrorName = (code: number): string => {
    return HTTP_ERROR_MAP[code] || "HTTP Error";
};

// ========== UTILITY FUNCTIONS ==========
const isFile = (value: any): boolean => {
    return value instanceof File || value instanceof Blob || value instanceof FormData;
};

const hasFile = (data: any): boolean => {
    if (isFile(data)) return true;
    if (Array.isArray(data)) return data.some(hasFile);
    if (typeof data === 'object' && data !== null) {
        return Object.values(data).some(hasFile);
    }
    return false;
};

const formatRequestBody = (data: any): FormData | string => {
    if (data instanceof FormData) return data;
    if (!hasFile(data)) return JSON.stringify(data);

    const formData = new FormData();

    const appendToFormData = (key: string, value: any) => {
        if (isFile(value)) {
            formData.append(key, value);
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                appendToFormData(`${key}[${index}]`, item);
            });
        } else if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
                appendToFormData(`${key}[${subKey}]`, subValue);
            });
        } else {
            formData.append(key, String(value));
        }
    };

    Object.entries(data).forEach(([key, value]) => {
        appendToFormData(key, value);
    });

    return formData;
};

const buildUrl = (endpoint: string, queryParams?: Payload): string => {
    if (!queryParams || Object.keys(queryParams).length === 0) {
        return endpoint;
    }

    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });

    const [baseUrl, existingQuery] = endpoint.split('?');
    const separator = existingQuery ? '&' : '?';

    return `${baseUrl}${separator}${searchParams.toString()}`;
};

// Type guards for auto-detection
// @ts-ignore
const isHTTPRequest = <T, B, Q, P>(props: UseRequestProps<T, B, Q, P>): props is HTTPProps<T, B, Q> => {
    return 'endpoint' in props && typeof props.endpoint === 'string';
};

// @ts-ignore
const isActionRequest = <T, B, Q, P>(props: UseRequestProps<T, B, Q, P>): props is ActionProps<T, P> => {
    return 'action' in props && typeof props.action === 'function';
};

// ========== MAIN HOOK ==========
export default function useRequest<
    T = any,
    B extends Payload = Payload,
    Q extends Payload = Payload,
    P extends Payload = Payload
>(props: UseRequestProps<T, B, Q, P>): UseRequestReturn<T, B, Q, P> {
    const [state, setState] = useState<RequestState<T>>({
        pending: false,
        error: null,
        data: null,
    });

    const [fieldErrors, setFieldErrors] = useState<FieldErrors<B, Q> | ParamsFieldErrors<P>>({});
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-detect request type
    const isHttpMode = isHTTPRequest(props);
    const isActionMode = isActionRequest(props);

    // Memoize validation data based on detected mode
    const validationDeps = useMemo(() => {
        if (isHttpMode) {
            return {
                body: JSON.stringify(props.body),
                queryParams: JSON.stringify(props.queryParams)
            };
        } else if (isActionMode) {
            return {
                params: JSON.stringify(props.params)
            };
        }
        return {};
    }, [isHttpMode, isActionMode, props]);

    const isValid = useMemo(() => {
        if (!props.validator) return true;

        if (isHttpMode) {
            const payloadToValidate = { body: props.body, queryParams: props.queryParams };

            if (props.validator instanceof z.ZodType) {
                const result = props.validator.safeParse(payloadToValidate);
                if (!result.success) {
                    const errors: FieldErrors<B, Q> = { body: {}, queryParams: {} };
                    result.error.issues.forEach(issue => {
                        if (issue.path.length >= 2) {
                            const [section, field] = issue.path as [keyof FieldErrors<B, Q>, string];
                            if (section === 'body' || section === 'queryParams') {
                                if (!errors[section]) errors[section] = {};
                                (errors[section] as any)[field] = issue.message;
                            }
                        }
                    });
                    setFieldErrors(errors);
                    return false;
                }
                setFieldErrors({});
                return true;
            }
            if (typeof props.validator === 'function') {
                return props.validator(payloadToValidate);
            }
        } else if (isActionMode) {
            const payloadToValidate = props.params || {} as P;

            if (props.validator instanceof z.ZodType) {
                const result = props.validator.safeParse(payloadToValidate);
                if (!result.success) {
                    const errors: ParamsFieldErrors<P> = { params: {} };
                    result.error.issues.forEach(issue => {
                        if (issue.path.length >= 1) {
                            const field = issue.path[0] as keyof P;
                            if (!errors.params) errors.params = {};
                            errors.params[field] = issue.message;
                        }
                    });
                    setFieldErrors(errors);
                    return false;
                }
                setFieldErrors({});
                return true;
            }
            if (typeof props.validator === 'function') {
                return props.validator(payloadToValidate);
            }
        }

        return false;
    }, [props.validator, validationDeps, isHttpMode, isActionMode]);

    const send = useCallback(async (): Promise<T> => {
        // Manual validation
        if (props.onValidate) {
            let validationResult: boolean;

            if (isHttpMode) {
                validationResult = props.onValidate({ body: props.body, queryParams: props.queryParams });
            } else if (isActionMode) {
                validationResult = props.onValidate(props.params || {} as P);
            } else {
                validationResult = false;
            }

            if (!validationResult) {
                const error: RequestError = {
                    type: "Validation Error",
                    message: "Manual validation failed",
                    status: 400,
                };
                setState(prev => ({ ...prev, error }));
                throw error;
            }
        }

        // Zod validation
        if (props.validator && !isValid) {
            const error: RequestError = {
                type: "Validation Error",
                message: "Request validation failed",
                status: 400,
            };
            setState(prev => ({ ...prev, error }));
            throw error;
        }

        // Cancel previous request if it's a fetch request
        if (isHttpMode && abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (isHttpMode) {
            abortControllerRef.current = new AbortController();
        }

        try {
            setState(prev => ({ ...prev, pending: true, error: null }));

            let responseData: any;

            if (isActionMode) {
                // Handle server action
                responseData = await props.action(props.params || {} as P);
                if (!responseData.status) throw new Error(responseData.message || "Unknown Error");
            } else if (isHttpMode) {
                // Handle fetch request
                const url = buildUrl(props.endpoint, props.queryParams);
                const requestBody = props.body ? formatRequestBody(props.body) : undefined;
                const containsFile = props.body ? hasFile(props.body) : false;

                const defaultHeaders: Record<string, string> = {};
                if (!containsFile && props.method !== 'GET' && requestBody) {
                    defaultHeaders['Content-Type'] = 'application/json';
                }

                const response = await fetch(url, {
                    method: props.method || 'GET',
                    headers: { ...defaultHeaders, ...(props.headers || {}) },
                    body: (props.method === 'GET' || !props.method) ? undefined : requestBody,
                    signal: abortControllerRef.current?.signal,
                });

                const contentType = response.headers.get('content-type');
                responseData = contentType?.includes('application/json')
                    ? await response.json()
                    : await response.text();

                if (!response.ok) {
                    const statusText = getHttpErrorName(response.status);
                    const errorMessage = typeof responseData === 'object' && responseData?.message
                        ? responseData.message
                        : `${response.status} ${statusText}`;

                    throw new HttpError(statusText, errorMessage, response.status);
                }
            } else {
                throw new Error("Invalid request configuration");
            }

            setState(prev => ({ ...prev, data: responseData as T }));
            await props.onSuccess?.(responseData as T);
            return responseData as T;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw error;
            }

            let errorObj: RequestError;

            if (error instanceof HttpError) {
                errorObj = {
                    type: error.name,
                    message: error.message,
                    status: error.status,
                };
            } else if (error instanceof Error) {
                errorObj = {
                    type: error.name || "Server Action Error",
                    message: error.message || "Unknown error occurred in server action",
                };
            } else {
                errorObj = {
                    type: "Unknown Error",
                    message: "An unknown error occurred",
                };
            }

            setState(prev => ({ ...prev, error: errorObj }));
            props.onError?.(errorObj);
            throw errorObj;

        } finally {
            setState(prev => ({ ...prev, pending: false }));
            props.onComplete?.();
            if (isHttpMode) {
                abortControllerRef.current = null;
            }
        }
    }, [props, isValid, isHttpMode, isActionMode]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const clearData = useCallback(() => {
        setState(prev => ({ ...prev, data: null }));
    }, []);

    return {
        ...state,
        isValid,
        fieldErrors,
        send,
        clearError,
        clearData,
    };
}