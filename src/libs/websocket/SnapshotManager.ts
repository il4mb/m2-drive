import { EntityMap, EntityName } from "@/server/database";
import { DatabaseChangePayload, QueryCondition, QueryConfig, QueryType } from "@/server/database/types";
import { Unsubscribe } from "@/types/global";
import { Query } from "./query";
import { SocketResult } from "@/server/socketHandlers";
import { Socket } from "socket.io-client";
import { isSpecialValue } from "@/server/objectHelper";

export type ListData<T> = {
    rows: T[];
    total: number;
}
export interface SnapshotOptions {
    onError?: (error: Error) => void;
    onMetadata?: (metadata: { lastUpdate: Date; count: number, source: string }) => void;
}

interface SnapshotSubscription {
    queryConfig: QueryConfig;
    callbacks: Map<Function, { options?: SnapshotOptions }>;
    unsubscribe: Unsubscribe;
    currentData: QueryConfig['type'] extends 'list' ? ListData<any> : any;
    subscribeId: string;
}

export class SnapshotManager {
    private static instance: SnapshotManager;
    private subscriptions: Map<string, SnapshotSubscription> = new Map();
    private socket: Socket | null = null;

    private constructor() { }

    public static getInstance(): SnapshotManager {
        if (!SnapshotManager.instance) {
            SnapshotManager.instance = new SnapshotManager();
        }
        return SnapshotManager.instance;
    }

    public setSocket(socket: Socket) {
        this.socket = socket;
    }

    private getQueryKey(queryConfig: QueryConfig): string {
        return JSON.stringify({
            collection: queryConfig.collection,
            type: queryConfig.type,
            conditions: queryConfig.conditions,
            relations: queryConfig.relations,
            orderBy: queryConfig.orderBy,
            limit: queryConfig.limit,
            offset: queryConfig.offset,
        });
    }

    public onSnapshot<T extends EntityName, Q extends QueryType, E = InstanceType<EntityMap[T]>>(
        query: Query<T, Q>,
        callback: Q extends "one" ? (data: E | null) => void : (data: ListData<E>) => void,
        options?: SnapshotOptions
    ): Unsubscribe {
        const queryConfig = query.toJSON();
        const queryKey = this.getQueryKey(queryConfig);
        const isCount = queryConfig.type == "count";
        const isSingle = queryConfig.type === "one";

        // Check if subscription already exists
        let subscription = this.subscriptions.get(queryKey);

        if (subscription) {
            // Add callback to existing subscription
            subscription.callbacks.set(callback, { options });

            // Immediately send current data to new callback if available
            if (subscription.currentData !== undefined) {
                try {
                    callback(subscription.currentData as any);
                } catch (error) {
                    console.error('Error in initial callback:', error);
                    options?.onError?.(error as Error);
                }
            }

            return () => this.removeCallback(queryKey, callback);
        }

        // Create new subscription
        let currentData: ListData<E> | E | number | null = isSingle ? null : { rows: [], total: 0 };
        let subscribeId = '';

        const callbacks = new Map<Function, { options?: SnapshotOptions }>();
        callbacks.set(callback, { options });

        const notifyAllCallbacks = (data: any) => {
            callbacks.forEach(({ options }, cb) => {
                try {
                    cb(data);
                } catch (error) {
                    console.error('Error in snapshot callback:', error);
                    options?.onError?.(error as Error);
                }
            });
        };

        const handleQueryResponse = (response: any) => {
            if (response.success) {
                if (isCount) {
                    currentData = parseInt(response.data) || 0;
                } else if (isSingle) {
                    const item = response.data || null;
                    if (item && !this.evaluateConditions(item, queryConfig.conditions)) {
                        currentData = null;
                    } else {
                        currentData = item;
                    }
                } else {
                    // Handle the new {rows, total} format
                    let filteredRows = (response.data.rows || []).filter((item: E) =>
                        this.evaluateConditions(item, queryConfig.conditions)
                    );

                    filteredRows = this.applySorting(queryConfig, filteredRows);
                    filteredRows = this.applyLimitOffset(queryConfig, filteredRows);

                    currentData = {
                        rows: filteredRows,
                        total: response.data.total || filteredRows.length
                    };
                }

                // Update subscription data and notify
                const currentSubscription = this.subscriptions.get(queryKey);
                if (currentSubscription) {
                    currentSubscription.currentData = currentData;
                    notifyAllCallbacks(currentData);
                }

                // Notify metadata
                callbacks.forEach(({ options }) => {
                    options?.onMetadata?.({
                        lastUpdate: new Date(),
                        count: isCount ? currentData as number : 
                               isSingle ? (currentData ? 1 : 0) : 
                               (currentData as ListData<E>).rows.length,
                        source: 'initial'
                    });
                });
            } else {
                callbacks.forEach(({ options }) => {
                    options?.onError?.(new Error(response.error));
                });
            }
        };

        const runExecuteQuery = () => {
            this.socket?.emit('execute-query', queryConfig, handleQueryResponse);
        }

        const handleDatabaseChange = (payload: DatabaseChangePayload) => {

            try {
                if (payload.collection !== queryConfig.collection) return;
                
                if (isCount) {
                    if (payload.eventName == "DELETE") {
                        currentData = parseInt(`${currentData || 0}`) - 1;
                    } else if (payload.eventName == "INSERT") {
                        currentData = parseInt(`${currentData || 0}`) + 1;
                    }

                    // Update subscription data and notify
                    const currentSubscription = this.subscriptions.get(queryKey);
                    if (currentSubscription) {
                        currentSubscription.currentData = currentData;
                        notifyAllCallbacks(currentData);
                    }

                    // Notify metadata
                    callbacks.forEach(({ options }) => {
                        options?.onMetadata?.({
                            lastUpdate: new Date(),
                            count: currentData as number,
                            source: 'change'
                        });
                    });
                    return;
                }

                const dataKeys = Object.keys(payload.data);

                if (dataKeys.length == 0 && payload.eventName == "DELETE") {
                    // manual refresh when delete with no response data
                    return runExecuteQuery();
                }

                const hasAllRelationKeys = queryConfig.relations?.every(table => dataKeys.includes(table)) ?? true;
                if (["INSERT", "UPDATE"].includes(payload.eventName) && queryConfig.relations?.length > 0 && !hasAllRelationKeys) {
                    return;
                }

                if (isSingle) {
                    this.handleSingleChange(payload, queryConfig, currentData, (newData: any) => {
                        currentData = newData;
                    });
                } else {
                    this.handleMultipleChange(payload, queryConfig, currentData as ListData<E>, (newData: any) => {
                        currentData = newData;
                    });
                }

                // Update subscription data and notify
                const currentSubscription = this.subscriptions.get(queryKey);
                if (currentSubscription) {
                    currentSubscription.currentData = currentData;
                    notifyAllCallbacks(currentData);
                }

                // Notify metadata
                callbacks.forEach(({ options }) => {
                    options?.onMetadata?.({
                        lastUpdate: new Date(),
                        count: isSingle ? (currentData ? 1 : 0) : (currentData as ListData<E>).rows.length,
                        source: 'change'
                    });
                });
            } catch (error) {
                console.error('Error handling database change:', error);
                callbacks.forEach(({ options }) => {
                    options?.onError?.(error as Error);
                });
            }
        };

        // Socket subscription logic
        this.socket?.emit('subscribe', {
            collection: queryConfig.collection,
            conditions: queryConfig.conditions,
            relations: queryConfig.relations
        }, (result: SocketResult) => {
            if (!result.success) {
                callbacks.forEach(({ options }) => {
                    options?.onError?.(new Error(result.error || "Subscription failed"));
                });
                return;
            }

            subscribeId = result.data.id;

            subscription = {
                queryConfig,
                callbacks,
                unsubscribe: () => {
                    this.socket?.off(`change-${subscribeId}`, handleDatabaseChange);
                    this.socket?.emit('unsubscribe', subscribeId);
                },
                currentData,
                subscribeId
            };

            this.subscriptions.set(queryKey, subscription);

            runExecuteQuery()
            this.socket?.on(`change-${subscribeId}`, handleDatabaseChange);
        });

        return () => {
            this.removeCallback(queryKey, callback);
        };
    }

    private removeCallback(queryKey: string, callback: Function) {
        const subscription = this.subscriptions.get(queryKey);
        if (!subscription) {
            return;
        }

        subscription.callbacks.delete(callback);

        if (subscription.callbacks.size === 0) {
            subscription.unsubscribe();
            this.subscriptions.delete(queryKey);
        }
    }

    private handleSingleChange(
        payload: DatabaseChangePayload,
        queryConfig: QueryConfig,
        currentData: any,
        updateData: (newData: any) => void
    ) {
        const current = currentData;
        const item = payload.data;

        switch (payload.eventName) {
            case "DELETE":
                if (current && this.resolveFieldValue(current, 'id') === this.resolveFieldValue(item, 'id')) {
                    updateData(null);
                }
                break;

            case "UPDATE":
            case "INSERT":
                const matchesConditions = this.evaluateConditions(item, queryConfig.conditions);
                const currentId = current ? this.resolveFieldValue(current, 'id') : null;
                const itemId = this.resolveFieldValue(item, 'id');

                if (matchesConditions) {
                    updateData(item);
                } else if (current && currentId === itemId) {
                    updateData(null);
                }
                break;
        }
    }

    private handleMultipleChange(
        payload: DatabaseChangePayload,
        queryConfig: QueryConfig,
        currentData: ListData<any>,
        updateData: (newData: ListData<any>) => void
    ) {
        const item = payload.data;
        const itemId = this.resolveFieldValue(item, 'id');

        switch (payload.eventName) {
            case "DELETE":
                const deleteIndex = currentData.rows.findIndex(i =>
                    this.resolveFieldValue(i, 'id') === itemId
                );
                if (deleteIndex !== -1) {
                    const newRows = [...currentData.rows];
                    newRows.splice(deleteIndex, 1);
                    updateData({
                        rows: newRows,
                        total: currentData.total - 1
                    });
                }
                break;

            case "UPDATE":
                const updateIndex = currentData.rows.findIndex(i =>
                    this.resolveFieldValue(i, 'id') === itemId
                );
                const matchesConditions = this.evaluateConditions(item, queryConfig.conditions);

                if (updateIndex !== -1) {
                    if (matchesConditions) {
                        const newRows = [...currentData.rows];
                        newRows[updateIndex] = item;
                        const sortedRows = this.applySorting(queryConfig, newRows);
                        const limitedRows = this.applyLimitOffset(queryConfig, sortedRows);
                        updateData({
                            rows: limitedRows,
                            total: currentData.total
                        });
                    } else {
                        const newRows = [...currentData.rows];
                        newRows.splice(updateIndex, 1);
                        updateData({
                            rows: newRows,
                            total: currentData.total - 1
                        });
                    }
                } else if (matchesConditions) {
                    const newRows = [...currentData.rows, item];
                    const sortedRows = this.applySorting(queryConfig, newRows);
                    const limitedRows = this.applyLimitOffset(queryConfig, sortedRows);
                    updateData({
                        rows: limitedRows,
                        total: currentData.total + 1
                    });
                }
                break;

            case "INSERT":
                const insertMatches = this.evaluateConditions(item, queryConfig.conditions);
                if (insertMatches) {
                    const newRows = [...currentData.rows, item];
                    const sortedRows = this.applySorting(queryConfig, newRows);
                    const limitedRows = this.applyLimitOffset(queryConfig, sortedRows);
                    updateData({
                        rows: limitedRows,
                        total: currentData.total + 1
                    });
                }
                break;
        }
    }

    private resolveFieldValue<T extends Record<string, any>>(obj: T, field: string): any {
        if (!field) return undefined;

        const resolvedField = field.startsWith('$') ? field.substring(1) : field;

        if (resolvedField.startsWith("@Json(")) {
            const pathMatch = resolvedField.match(/\@Json\((.*?)\)/);
            if (!pathMatch?.[1]) return undefined;

            let jsonPath = pathMatch[1].replace(/^["']|["']$/g, '');
            jsonPath = jsonPath.replace(/\"\./g, '.').replace(/\.\"/g, '.');

            const pathParts = jsonPath.split(".");
            let currentValue: any = obj;

            for (const part of pathParts) {
                if (currentValue === null || currentValue === undefined) {
                    return undefined;
                }
                if (Array.isArray(currentValue) && !isNaN(Number(part))) {
                    currentValue = currentValue[Number(part)];
                } else if (typeof currentValue === 'object' && part in currentValue) {
                    currentValue = currentValue[part];
                } else {
                    return undefined;
                }
            }
            return currentValue;
        }

        if (resolvedField.includes('.')) {
            const pathParts = resolvedField.split('.');
            let currentValue: any = obj;

            for (const part of pathParts) {
                if (currentValue === null || currentValue === undefined) {
                    return undefined;
                }
                if (Array.isArray(currentValue) && !isNaN(Number(part))) {
                    currentValue = currentValue[Number(part)];
                } else if (typeof currentValue === 'object' && part in currentValue) {
                    currentValue = currentValue[part];
                } else {
                    return undefined;
                }
            }
            return currentValue;
        }

        if (resolvedField in obj) {
            return obj[resolvedField];
        }

        return undefined;
    }

    private evaluateCondition(item: any, condition: QueryCondition): boolean {
        const { field, operator, value } = condition;
        const actualValue = this.resolveFieldValue(item, field);

        if (operator === 'IS NULL') {
            return actualValue === null || actualValue === undefined;
        }

        if (operator === 'IS NOT NULL') {
            return actualValue !== null && actualValue !== undefined;
        }

        if (isSpecialValue(value)) {
            return value === "@IsNull"
                ? actualValue === null || actualValue === undefined
                : actualValue !== null && actualValue !== undefined;
        }

        if (actualValue === null || actualValue === undefined) {
            if (operator === '==') return actualValue === value;
            if (operator === '!=') return actualValue !== value;
            return false;
        }

        switch (operator) {
            case "==": return actualValue == value;
            case "!=": return actualValue != value;
            case ">": return actualValue > value;
            case ">=": return actualValue >= value;
            case "<": return actualValue < value;
            case "<=": return actualValue <= value;

            case "LIKE":
            case "STARTS WITH":
                if (typeof actualValue !== "string" || typeof value !== "string") return false;
                return operator === "STARTS WITH"
                    ? actualValue.startsWith(value)
                    : actualValue.includes(value);

            case "ILIKE":
                if (typeof actualValue !== "string" || typeof value !== "string") return false;
                return actualValue.toLowerCase().includes(value.toLowerCase());

            case "NOT LIKE":
            case "ENDS WITH":
                if (typeof actualValue !== "string" || typeof value !== "string") return false;
                return operator === "ENDS WITH"
                    ? actualValue.endsWith(value)
                    : !actualValue.includes(value);

            case "NOT ILIKE":
                if (typeof actualValue !== "string" || typeof value !== "string") return false;
                return !actualValue.toLowerCase().includes(value.toLowerCase());

            case "IN": return Array.isArray(value) && value.includes(actualValue);
            case "NOT IN": return Array.isArray(value) && !value.includes(actualValue);

            case "BETWEEN":
                return Array.isArray(value) && value.length === 2 &&
                    actualValue >= value[0] && actualValue <= value[1];

            case "NOT BETWEEN":
                return Array.isArray(value) && value.length === 2 &&
                    (actualValue < value[0] || actualValue > value[1]);

            case "REGEXP":
                if (typeof actualValue !== "string" || typeof value !== "string") return false;
                try { return new RegExp(value).test(actualValue); } catch { return false; }

            case "NOT REGEXP":
                if (typeof actualValue !== "string" || typeof value !== "string") return false;
                try { return !new RegExp(value).test(actualValue); } catch { return false; }

            case "CONTAINS":
                return Array.isArray(actualValue) && actualValue.includes(value);

            case "NOT CONTAINS":
                return Array.isArray(actualValue) && !actualValue.includes(value);

            case "EXISTS":
                return actualValue !== null && actualValue !== undefined;

            case "NOT EXISTS":
                return actualValue === null || actualValue === undefined;

            case "STARTS WITH":
                return typeof actualValue === "string" && typeof value === "string" &&
                    actualValue.startsWith(value);

            case "ENDS WITH":
                return typeof actualValue === "string" && typeof value === "string" &&
                    actualValue.endsWith(value);

            default: return false;
        }
    }

    private evaluateConditions(item: any, conditions?: QueryCondition[]): boolean {
        if (!conditions || conditions.length === 0) return true;

        let result: boolean | null = null;
        let currentLogical: "AND" | "OR" = "AND";

        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i];
            const logicalOperator = condition.logical || (i === 0 ? "AND" : currentLogical);

            let conditionResult: boolean;

            if (condition.children && condition.children.length > 0) {
                conditionResult = this.evaluateConditions(item, condition.children);
            } else {
                conditionResult = this.evaluateCondition(item, condition);
            }

            if (result === null) {
                result = conditionResult;
            } else {
                result = logicalOperator === "AND"
                    ? result && conditionResult
                    : result || conditionResult;
            }

            currentLogical = condition.logical || currentLogical;

            if (logicalOperator === "AND" && result === false) break;
            if (logicalOperator === "OR" && result === true) break;
        }

        return result ?? true;
    }

    private applySorting(queryConfig: QueryConfig, data: any[]): any[] {
        if (!queryConfig.orderBy) return data;

        const { field, direction } = queryConfig.orderBy;

        return [...data].sort((a, b) => {
            const aValue = this.resolveFieldValue(a, field);
            const bValue = this.resolveFieldValue(b, field);

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return direction === 'ASC' ? -1 : 1;
            if (bValue == null) return direction === 'ASC' ? 1 : -1;

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else if (aValue instanceof Date && bValue instanceof Date) {
                comparison = aValue.getTime() - bValue.getTime();
            } else {
                comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }

            return direction === 'ASC' ? comparison : -comparison;
        });
    }

    private applyLimitOffset(queryConfig: QueryConfig, data: any[]): any[] {
        let result = data;
        if (queryConfig.offset) result = result.slice(queryConfig.offset);
        if (queryConfig.limit) result = result.slice(0, queryConfig.limit);
        return result;
    }

    public getStats() {
        return {
            totalSubscriptions: this.subscriptions.size,
            totalCallbacks: Array.from(this.subscriptions.values())
                .reduce((sum, sub) => sum + sub.callbacks.size, 0),
            subscriptions: Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
                queryKey: key,
                callbackCount: sub.callbacks.size,
                collection: sub.queryConfig.collection,
                subscribeId: sub.subscribeId
            }))
        };
    }

    public cleanupAll() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions.clear();
    }
}


// Single-item overload
export function onSnapshot<T extends EntityName, Q extends 'one', E = InstanceType<EntityMap[T]>>(
    query: Query<T, Q>,
    callback: (data: E | null) => void,
    options?: SnapshotOptions
): Unsubscribe;

// Many-items overload
export function onSnapshot<T extends EntityName, Q extends 'list', E = InstanceType<EntityMap[T]>>(
    query: Query<T, Q>,
    callback: (data: ListData<E>) => void,
    options?: SnapshotOptions
): Unsubscribe;

// Count overload
export function onSnapshot<T extends EntityName, Q extends 'count', E = InstanceType<EntityMap[T]>>(
    query: Query<T, Q>,
    callback: (count: number) => void,
    options?: SnapshotOptions
): Unsubscribe;

export function onSnapshot<
    T extends EntityName,
    Q extends QueryType,
    E = InstanceType<EntityMap[T]>
>(
    query: Query<T, Q>,
    callback: Q extends "one" ? (data: E | null) => void : (data: ListData<E>) => void,
    options?: SnapshotOptions
): Unsubscribe {
    const manager = SnapshotManager.getInstance();
    return manager.onSnapshot(query, callback, options);
}

export function initializeSnapshotManager(socket: Socket) {
    const manager = SnapshotManager.getInstance();
    manager.setSocket(socket);
}