'use client'

import { useState } from "react";

type IRequest = {
    pending: boolean;
    error: {
        type: string;   // e.g. "Bad Request", "Not Found"
        message: string; // message from body if available
    } | null;
    send: () => Promise<void>;
    errorClear: () => void;
};

type useRequestProps = {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    body?: { [key: string]: any };
    search?: { [key: string]: any };
    onValidate?: () => boolean;
    onResult?: (result: any) => void;
    onError?: (err: IRequest['error']) => void;
    onFinish?: () => void;
};

export const useRequest = ({
    endpoint,
    method,
    body,
    search,
    onValidate,
    onResult,
    onError,
    onFinish
}: useRequestProps): IRequest => {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<IRequest["error"]>(null);

    const send = async () => {
        if (onValidate && !onValidate()) return;

        try {
            setPending(true);
            setError(null);

            const hasFile = body ? isHasFile(body) : false;
            const payload = body ? formatBody(body, hasFile) : undefined;

            const searchParams = new URLSearchParams(endpoint);
            Object.entries(search || {}).forEach(([key, value]) => {
                searchParams.set(key, value);
            });
            const url = searchParams.size > 0 ? endpoint.replace(/\?.*/, '') + "?" + searchParams : endpoint;
            
            const res = await fetch(url, {
                method,
                headers: hasFile ? undefined : { "Content-Type": "application/json" },
                body: method === "GET" ? undefined : payload,
            });

            const result = await res.json().catch(() => null);

            if (!res.ok || !result?.status) {
                const status = res.status;
                const statusText = getHttpErrorName(status);
                const message = result?.message || `${status} ${statusText}`;
                throw new HttpError(statusText, message, status);
            }

            onResult?.(result);

        } catch (err: any) {
            let errorObj: IRequest["error"];

            if (err instanceof HttpError) {
                errorObj = { type: err.name, message: err.message.replace(/^\d+\:/, '').trim() };
            } else {
                errorObj = {
                    type: err.name || "Network Error",
                    message: err.message || "Unknown error",
                };
            }

            setError(errorObj);
            onError?.(errorObj);

            throw err;

        } finally {
            setPending(false);
            onFinish?.();
        }
    };

    return { pending, error, send, errorClear: () => setError(null) };
};

/**
 * Custom HttpError class
 */
class HttpError extends Error {
    status: number;
    constructor(name: string, message: string, status: number) {
        super(message);
        this.name = name; // maps to type
        this.status = status;
    }
}

/**
 * Map HTTP status code → Error name
 */
const getHttpErrorName = (code: number): string => {
    const map: Record<number, string> = {
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
    return map[code] || "HTTP Error";
};

/**
 * Recursively check if object contains File/Blob
 */
const isHasFile = (data: { [key: string]: any }): boolean => {
    return Object.values(data).some((val) => {
        if (val instanceof File || val instanceof Blob) return true;
        if (typeof val === "object" && val !== null) return isHasFile(val);
        return false;
    });
};

/**
 * Format body as JSON or FormData
 */
const formatBody = (data: { [key: string]: any }, hasFile: boolean): FormData | string => {
    if (!hasFile) {
        return JSON.stringify(data);
    }
    const formData = new FormData();
    const appendFormData = (fd: FormData, key: string, value: any) => {
        if (value instanceof File || value instanceof Blob) {
            fd.append(key, value);
        } else if (typeof value === "object" && value !== null) {
            Object.entries(value).forEach(([subKey, subVal]) =>
                appendFormData(fd, `${key}[${subKey}]`, subVal)
            );
        } else {
            fd.append(key, String(value));
        }
    };
    Object.entries(data).forEach(([key, value]) => appendFormData(formData, key, value));
    return formData;
};
