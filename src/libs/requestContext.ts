import User from "@/entity/User";
import { AsyncLocalStorage } from "async_hooks";

type RequestContextType = {
    user?: User | 'system';
};

export const requestContext = new AsyncLocalStorage<RequestContextType>();

// Helper to get current context
export function getRequestContext() {
    return requestContext.getStore() || {};
}
