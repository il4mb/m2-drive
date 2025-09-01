type InvokeResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}