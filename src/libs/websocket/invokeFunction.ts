import { socket } from "@/socket";

type InvokeResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

export function invokeFunction<
    T extends (...params: any[]) => any,
    R = Awaited<ReturnType<T>>
>(
    func: T,
    ...args: Parameters<T> extends [] ? [] : [args: Parameters<T>[0]]
): Promise<InvokeResult<R>> {
    return new Promise((resolve) => {
        socket.emit(
            "invoke-function",
            {
                function: func.name,
                args: args[0] ?? {}
            },
            (data: InvokeResult<R>) => {
                if (!data.success) {
                    console.warn(data.error);
                }
                resolve(data);
            }
        );
    });
}
