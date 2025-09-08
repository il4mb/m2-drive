export function createFunction<T extends (args: any) => Promise<any>>(handler: T) {
    return async (args: Parameters<T>[0]): Promise<Awaited<ReturnType<T>>> => {
        // Detect unknown props
        const allowedKeys = Object.keys(args as any);
        const expectedKeys = Object.keys(args as any); // Replace with explicit schema if needed
        const extraKeys = allowedKeys.filter(k => !expectedKeys.includes(k));

        if (extraKeys.length > 0) {
            throw new Error(`Unexpected properties: ${extraKeys.join(", ")}`);
        }

        return handler(args) as Awaited<ReturnType<T>>;
    };
}
