export const createLogger = (name: string) => {
    return {
        log: (message: string, data?: any) => {
            console.log(message, data);
        },
        warn: (message: string, data?: any) => {
            console.warn(message, data);

        },
        error: (message: string, data?: any) => {
            console.error(message, data);
        },
        debug: (message: string, data?: any) => {
            console.debug(message, data);
        },
        info: (message: string, data?: any) => {
            console.debug(message, data);
        },
    }
}