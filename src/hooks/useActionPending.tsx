'use client'

import { useState } from "react";

export const useActionPending = <
    T extends (...args: any[]) => any
>(
    action: T
): [boolean, (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>] => {
    const [loading, setLoading] = useState(false);

    const invoke = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
        if (loading) return undefined as Awaited<ReturnType<T>>;
        setLoading(true);
        try {
            return await action(...args);
        } catch (e) {
            console.error("useActionPending error:", e);
            throw e;
        } finally {
            setTimeout(() => setLoading(false), 300);
        }
    };

    return [loading, invoke];
};
