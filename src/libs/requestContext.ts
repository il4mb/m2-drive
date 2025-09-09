import User from "@/entities/User";
import { AsyncLocalStorage } from "async_hooks";

type RequestContextType = {
    user?: User | 'system'|null;
    ipAddress?: string;
    userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextType>();

// Helper to get current context
export function getRequestContext() {
    return requestContext.getStore() || {};
}
