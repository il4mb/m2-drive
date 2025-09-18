import { socket } from "@/socket";
import { FunctionName, FunctionProps, FunctionReturn } from "@/server/functions";

type CacheEntry<T> = {
    timestamp: number;
    result?: InvokeResult<T>;
};


type InvokeResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

const invokeCache = new Map<string, CacheEntry<any>>();

export function invokeFunction<N extends FunctionName>(
    name: N,
    args?: FunctionProps<N>
): Promise<InvokeResult<FunctionReturn<N>>> {
    const key = `${name}:${stableKey(args)}`;
    const now = Date.now();
    const entry = invokeCache.get(key);

    // If duplicate within 300ms → return last cached result (if any)
    if (entry && now - entry.timestamp < 300) {
        if (entry.result) {
            return Promise.resolve(entry.result as InvokeResult<FunctionReturn<N>>);
        }
        return Promise.resolve({
            success: false,
            error: "Duplicate request ignored",
        } as InvokeResult<FunctionReturn<N>>);
    }

    return new Promise((resolve) => {
        socket.emit(
            "invoke-function",
            { function: name, args },
            (data: InvokeResult<FunctionReturn<N>>) => {
                // Cache latest result
                invokeCache.set(key, { timestamp: now, result: data });
                if (!data.success) {
                    console.warn(data.error);
                }
                resolve(data);
            }
        );
    });
}


function stableKey(obj: unknown): string {
    if (obj === null || typeof obj !== "object") return String(obj);

    if (Array.isArray(obj)) {
        return `[${obj.map(stableKey).join(",")}]`;
    }

    // Sort keys for stable ordering
    const keys = Object.keys(obj).sort();
    return `{${keys.map(k => `${k}:${stableKey((obj as any)[k])}`).join(",")}}`;
}
