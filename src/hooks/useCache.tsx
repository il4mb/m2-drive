import { useEffect, useState, useCallback, useRef } from "react";
import { Cache } from "@/types";
import { useCacheIdb } from "@/components/context/IDBMProvider";

/**
 * Custom hook for persisting and retrieving a cached value by key.
 */
export default function useCache(key: string): [Cache | null, (v: Omit<Cache, "key">) => Promise<void>, boolean] {

    const db = useCacheIdb();
    const [value, setValue] = useState<Cache | null>(null);
    const [locked, setLocked] = useState(true);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = !locked;
    }, [locked])

    // Load initial value from IndexedDB
    useEffect(() => {
        (async () => {
            const cached = await db.get({ key });
            setValue(cached || null);
            setTimeout(() => {
                setLocked(false);
            }, 0);
        })();
        return () => {
            setLocked(true);
        };
    }, [db, key]);

    // Stable setter
    const setCache = useCallback(async (data: Omit<Cache, "key">) => {
        if (!mountedRef.current) return;
        const newValue: Cache = { ...data, key };
        setValue(newValue);
        await db.add(newValue);
    }, [db, key]);

    return [value, setCache, locked];
}
