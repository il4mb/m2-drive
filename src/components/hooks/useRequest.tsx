'use client'

import { useCallback, useEffect, useRef, useState } from "react";

type RequestError = {
    type: string;   // e.g. "Bad Request", "Not Found"
    message: string; // message from body if available
    status?: number; // HTTP status code
};

type RequestState<T = any> = {
    pending: boolean;
    error: RequestError | null;
    data: T | null;
};

type UseRequestProps<T = any> = {
    endpoint: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: { [key: string]: any };
    queryParams?: { [key: string]: any };
    headers?: { [key: string]: string };
    onValidate?: (data: { body?: { [key: string]: any }; queryParams?: { [key: string]: any } }) => boolean;
    onSuccess?: (result: T) => void;
    onError?: (error: RequestError) => void;
    onComplete?: () => void;
};

type UseRequestReturn<T = any> = RequestState<T> & {
    send: (overrides?: { body?: { [key: string]: any }; queryParams?: { [key: string]: any } }, signal?: AbortSignal) => Promise<T>;
    clearError: () => void;
    clearData: () => void;
};

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

const hasFile = (data: any): boolean => {
    if (data instanceof File || data instanceof Blob || data instanceof FormData) {
        return true;
    }

    if (Array.isArray(data)) {
        return data.some(hasFile);
    }

    if (typeof data === 'object' && data !== null) {
        return Object.values(data).some(hasFile);
    }

    return false;
};

const formatRequestBody = (data: any): FormData | string => {
    if (data instanceof FormData) {
        return data;
    }

    const containsFile = hasFile(data);

    if (!containsFile) {
        return JSON.stringify(data);
    }

    const formData = new FormData();
    const appendToFormData = (key: string, value: any) => {
        if (value instanceof File || value instanceof Blob) {
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

const buildUrl = (endpoint: string, queryParams?: { [key: string]: any }): string => {
    if (!queryParams || Object.keys(queryParams).length === 0) {
        return endpoint;
    }

    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });

    // Handle endpoints that already have query params
    const [baseUrl, existingQuery] = endpoint.split('?');
    const separator = existingQuery ? '&' : '?';

    return `${baseUrl}${separator}${searchParams.toString()}`;
};

export default function useRequest<T = any>({
    endpoint,
    method = "GET",
    body,
    queryParams,
    headers = {},
    onValidate,
    onSuccess,
    onError,
    onComplete,
}: UseRequestProps<T>): UseRequestReturn<T> {

    const [state, setState] = useState<RequestState<T>>({
        pending: false,
        error: null,
        data: null,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const send = useCallback(
        async (
            overrides?: {
                body?: { [key: string]: any };
                queryParams?: { [key: string]: any }
            },
            signal?: AbortSignal
        ) => {

            const mergedBody = overrides?.body ?? body;
            const mergedQueryParams = overrides?.queryParams ?? queryParams;

            return new Promise<T>(async (resolve, reject) => {
                if (onValidate && !onValidate({ body: mergedBody, queryParams: mergedQueryParams })) {
                    return reject();
                }

                // Cancel any ongoing request
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                abortControllerRef.current = new AbortController();

                try {

                    setState(prev => ({ ...prev, pending: true, error: null }));

                    const url = buildUrl(endpoint, mergedQueryParams);
                    const requestBody = mergedBody ? formatRequestBody(mergedBody) : undefined;
                    const containsFile = mergedBody ? hasFile(mergedBody) : false;

                    const defaultHeaders: Record<string, string> = {};
                    if (!containsFile && method !== 'GET' && requestBody) {
                        defaultHeaders['Content-Type'] = 'application/json';
                    }

                    const response = await fetch(url, {
                        method,
                        headers: { ...defaultHeaders, ...headers },
                        body: method === 'GET' ? undefined : requestBody,
                        signal: signal || abortControllerRef.current.signal,
                    });

                    let responseData;
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        responseData = await response.json();
                    } else {
                        responseData = await response.text();
                    }

                    if (!response.ok) {
                        const statusText = getHttpErrorName(response.status);
                        const errorMessage =
                            (typeof responseData === 'object' && responseData?.message)
                            || `${response.status} ${statusText}`;

                        throw new HttpError(statusText, errorMessage, response.status);
                    }

                    setState(prev => ({ ...prev, data: responseData }));
                    onSuccess?.(responseData);
                    resolve(responseData);

                } catch (error: any) {
                    // Ignore abort errors
                    if (error.name === 'AbortError') {
                        return;
                    }

                    let errorObj: RequestError;

                    if (error instanceof HttpError) {
                        errorObj = {
                            type: error.name,
                            message: error.message,
                            status: error.status,
                        };
                    } else {
                        errorObj = {
                            type: error.name || "Network Error",
                            message: error.message || "Unknown error occurred",
                        };
                    }

                    setState(prev => ({ ...prev, error: errorObj }));
                    onError?.(errorObj);
                    reject(error);

                } finally {
                    setState(prev => ({ ...prev, pending: false }));
                    onComplete?.();
                    abortControllerRef.current = null;
                }
            })

        }, [endpoint, method, JSON.stringify(body), JSON.stringify(queryParams), JSON.stringify(headers), onValidate, onSuccess, onError, onComplete]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const clearData = useCallback(() => {
        setState(prev => ({ ...prev, data: null }));
    }, []);

    return {
        ...state,
        send,
        clearError,
        clearData,
    };
};