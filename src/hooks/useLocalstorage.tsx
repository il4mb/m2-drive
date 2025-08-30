'use client'

import { useEffect, useState } from "react";

export default function useLocalStorage<T>(key: string, initialValue: T) {

    const [mounted, setMounted] = useState(false);
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        if (!mounted) return;
        if (value == initialValue) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }, [key, value, mounted]);

    useEffect(() => {
        setValue(() => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : initialValue;
            } catch (err) {
                console.error(err);
                return initialValue;
            } finally {
                setTimeout(() => setMounted(true), 0);
            }
        });
        return () => {
            setMounted(false);
        }
    }, [key]);

    return [value, setValue, mounted] as const;
}
