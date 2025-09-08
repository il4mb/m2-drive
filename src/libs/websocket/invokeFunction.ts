import { socket } from "@/socket";
import { FunctionName, FunctionProps, FunctionReturn } from "@/server/functions";

type InvokeResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

const invokeCache = new Map<string, number>();

export function invokeFunction<N extends FunctionName>(
    name: N,
    args: FunctionProps<N>
): Promise<InvokeResult<FunctionReturn<N>>> {
    const key = `${name}:${stableKey(args)}`;
    const now = Date.now();

    if (invokeCache.has(key) && now - (invokeCache.get(key) || 0) < 300) {
        return Promise.resolve({
            success: false,
            error: "Duplicate request ignored",
        } as InvokeResult<FunctionReturn<N>>);
    }

    invokeCache.set(key, now);

    return new Promise((resolve) => {
        socket.emit(
            "invoke-function",
            { function: name, args },
            (data: InvokeResult<FunctionReturn<N>>) => {
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
