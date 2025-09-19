import { useEffect, useState, useCallback, useRef } from "react";
import { Cache } from "@/types";
import { useCacheIdb } from "@/components/context/IDBMProvider";

/**
 * Custom hook for persisting and retrieving a cached value by key.
 */
export default function useCache(key?: string): [Cache | null, (v: Omit<Cache, "key">) => Promise<void>, boolean] {

    const db = useCacheIdb();
    const [value, setValue] = useState<Cache | null>(null);
    const [pending, setPending] = useState(true);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = !pending;
    }, [pending])

    // Load initial value from IndexedDB
    useEffect(() => {
        if (!key || !db) return;
        (async () => {
            const cached = await db.get({ key });
            setValue(cached || null);
            setTimeout(() => {
                setPending(false);
            }, 0);
        })();
        return () => {
            setPending(true);
        };
    }, [db, key]);

    // Stable setter
    const setCache = useCallback(async (data: Omit<Cache, "key">) => {
        if (!mountedRef.current || !key) return;
        const newValue: Cache = { ...data, key };
        setValue(newValue);
        await db.add(newValue);
    }, [db, key]);

    return [value, setCache, pending];
}
