'use client'

import { useState } from "react";

export const useActionPending = <T extends (...args: any[]) => void | Promise<any>>(action: T): [boolean, () => void] => {
    const [loading, setLoading] = useState(false);

    const invoke = async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
        if (loading) return;
        setLoading(true);
        try {
            // Await in case it's async
            return await action(...args);
        } catch (e) {
            console.error("useActionPending error:", e);
            throw e; // rethrow if you want to handle outside
        } finally {
            // Small delay so loading state feels smooth
            setTimeout(() => setLoading(false), 300);
        }
    };

    return [loading, invoke];
};
