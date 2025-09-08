// lib/snapshot.ts
import { socket } from '@/socket';
import { Query } from './query';
import { EntityMap, EntityName } from '@/server/database';
import { QueryCondition, QueryType } from '@/server/database/types';
import { DatabaseChangePayload } from '@/server/database/types';
import { isSpecialValue } from '@/server/objectHelper';
import { Unsubscribe } from '@/types/global';
import { SocketResult } from '@/server/socketHandlers';
import { SnapshotOptions } from './SnapshotManager';


// Single-item overload
export function onSnapshot<T extends EntityName, Q extends 'one', E = InstanceType<EntityMap[T]>>(
    query: Query<T, Q>,
    callback: (data: E | null) => void,
    options?: SnapshotOptions
): Unsubscribe;

// Many-items overload
export function onSnapshot<T extends EntityName, Q extends 'list', E = InstanceType<EntityMap[T]>>(
    query: Query<T, Q>,
    callback: (data: E[]) => void,
    options?: SnapshotOptions
): Unsubscribe;




export function onSnapshot<
    T extends EntityName,
    Q extends QueryType,
    E = InstanceType<EntityMap[T]>
>(
    query: Query<T, Q>,
    callback: Q extends "one" ? (data: E | null) => void : (data: E[]) => void,
    options?: SnapshotOptions
): Unsubscribe {

    const queryConfig = query.toJSON();
    const isSingle = queryConfig.type === "one";

    // Store correct shape for currentData
    let currentData: E[] | E | null = isSingle ? null : [];
    let subscribeId = '';

    // Helper to get nested properties (from your server code)
    const resolveFieldValue = <T extends Record<string, any>>(obj: T, field: string): any => {
        if (!field) return undefined;

        const resolvedField = field.startsWith('$') ? field.substring(1) : field;

        // Handle JSON path syntax: @Json("field.path.to.value")
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

        // Handle dot notation for nested properties
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

        // Direct field access
        if (resolvedField in obj) {
            return obj[resolvedField];
        }

        return undefined;
    };

    // Enhanced condition evaluation (from your server code)
    const evaluateCondition = (item: any, condition: QueryCondition): boolean => {
        const { field, operator, value } = condition;
        const actualValue = resolveFieldValue(item, field);

        // Handle NULL/IS NULL/IS NOT NULL operators
        if (operator === 'IS NULL') {
            return actualValue === null || actualValue === undefined;
        }

        if (operator === 'IS NOT NULL') {
            return actualValue !== null && actualValue !== undefined;
        }

        // Handle special values (@IsNull, @NotNull)
        if (isSpecialValue(value)) {
            return value === "@IsNull"
                ? actualValue === null || actualValue === undefined
                : actualValue !== null && actualValue !== undefined;
        }

        // Handle null/undefined actual values for non-null operators
        if (actualValue === null || actualValue === undefined) {
            if (operator === '==') return actualValue === value;
            if (operator === '!=') return actualValue !== value;
            return false;
        }

        // Operator handling
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
    };

    // Recursive condition evaluation with logical operators
    const evaluateConditions = (item: any, conditions?: QueryCondition[]): boolean => {
        if (!conditions || conditions.length === 0) return true;

        let result: boolean | null = null;
        let currentLogical: "AND" | "OR" = "AND";

        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i];
            const logicalOperator = condition.logical || (i === 0 ? "AND" : currentLogical);

            let conditionResult: boolean;

            if (condition.children && condition.children.length > 0) {
                conditionResult = evaluateConditions(item, condition.children);
            } else {
                conditionResult = evaluateCondition(item, condition);
            }

            if (result === null) {
                result = conditionResult;
            } else {
                result = logicalOperator === "AND"
                    ? result && conditionResult
                    : result || conditionResult;
            }

            currentLogical = condition.logical || currentLogical;

            // Short-circuit evaluation
            if (logicalOperator === "AND" && result === false) break;
            if (logicalOperator === "OR" && result === true) break;
        }

        return result ?? true;
    };

    // Enhanced sorting with nested field support
    const applySorting = (data: E[]): E[] => {
        if (!queryConfig.orderBy) return data;

        const { field, direction } = queryConfig.orderBy;

        return [...data].sort((a, b) => {
            // @ts-ignore
            const aValue = resolveFieldValue(a, field);
            // @ts-ignore
            const bValue = resolveFieldValue(b, field);

            // Handle null/undefined values
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
    };

    // Apply limit and offset
    const applyLimitOffset = (data: E[]): E[] => {
        let result = data;
        if (queryConfig.offset) result = result.slice(queryConfig.offset);
        if (queryConfig.limit) result = result.slice(0, queryConfig.limit);
        return result;
    };

    const handleQueryResponse = (response: any) => {
        if (response.success) {
            if (isSingle) {
                const item = response.data || null;
                if (item && !evaluateConditions(item, queryConfig.conditions)) {
                    currentData = null;
                } else {
                    currentData = item;
                }
                // @ts-ignore
                (callback as (data: E | null) => void)(currentData);
            } else {
                let filteredData = (response.data || []).filter((item: E) =>
                    evaluateConditions(item, queryConfig.conditions)
                );

                filteredData = applySorting(filteredData);
                filteredData = applyLimitOffset(filteredData);

                currentData = filteredData;
                // @ts-ignore
                (callback as (data: E[]) => void)(currentData);
            }

            options?.onMetadata?.({
                lastUpdate: new Date(),
                count: Array.isArray(currentData) ? currentData.length : (currentData ? 1 : 0),
                // @ts-ignore
                source: 'initial'
            });
        } else {
            console.warn('Query failed:', response);
            options?.onError?.(new Error(response.error));
        }
    };

    const handleDatabaseChange = (payload: DatabaseChangePayload) => {
        if (payload.collection !== queryConfig.collection) return;

        const dataKeys = Object.keys(payload.data);
        const hasAllRelationKeys = queryConfig.relations.every(table => dataKeys.includes(table));
        if (["INSERT", "UPDATE"].includes(payload.eventName) && queryConfig.relations.length > 0 && !hasAllRelationKeys) return;

        try {
            if (isSingle) {
                handleSingleChange(payload);
            } else {
                handleMultipleChange(payload);
            }

            options?.onMetadata?.({
                lastUpdate: new Date(),
                count: Array.isArray(currentData) ? currentData.length : (currentData ? 1 : 0),
                // @ts-ignore
                source: 'change'
            });
        } catch (error) {
            console.error('Error handling database change:', error);
            options?.onError?.(error as Error);
        }
    };

    const handleSingleChange = (payload: DatabaseChangePayload) => {
        const current = currentData as E | null;
        const item = payload.data;

        switch (payload.eventName) {
            case "DELETE":
                if (current && resolveFieldValue(current, 'id') === resolveFieldValue(item, 'id')) {
                    currentData = null;
                    (callback as (data: E | null) => void)(null);
                }
                break;

            case "UPDATE":
            case "INSERT":
                const matchesConditions = evaluateConditions(item, queryConfig.conditions);
                const currentId = current ? resolveFieldValue(current, 'id') : null;
                const itemId = resolveFieldValue(item, 'id');

                if (matchesConditions) {
                    currentData = item;
                    (callback as (data: E | null) => void)(item);
                } else if (current && currentId === itemId) {
                    currentData = null;
                    (callback as (data: E | null) => void)(null);
                }
                break;
        }
    };

    const handleMultipleChange = (payload: DatabaseChangePayload) => {
        const current = currentData as E[];
        const item = payload.data;
        const itemId = resolveFieldValue(item, 'id');

        switch (payload.eventName) {
            case "DELETE":
                const deleteIndex = current.findIndex(i =>
                    // @ts-ignore
                    resolveFieldValue(i, 'id') === itemId
                );
                if (deleteIndex !== -1) {
                    const newData = [...current];
                    newData.splice(deleteIndex, 1);
                    currentData = newData;
                    (callback as (data: E[]) => void)(newData);
                }
                break;

            case "UPDATE":
                const updateIndex = current.findIndex(i =>
                    // @ts-ignore
                    resolveFieldValue(i, 'id') === itemId
                );
                const matchesConditions = evaluateConditions(item, queryConfig.conditions);

                if (updateIndex !== -1) {
                    if (matchesConditions) {
                        const newData = [...current];
                        newData[updateIndex] = item;
                        currentData = applySorting(newData);
                        (callback as (data: E[]) => void)(currentData);
                    } else {
                        const newData = [...current];
                        newData.splice(updateIndex, 1);
                        currentData = newData;
                        (callback as (data: E[]) => void)(newData);
                    }
                } else if (matchesConditions) {
                    const newData = [...current, item];
                    currentData = applySorting(newData);
                    currentData = applyLimitOffset(currentData);
                    (callback as (data: E[]) => void)(currentData);
                }
                break;

            case "INSERT":
                const insertMatches = evaluateConditions(item, queryConfig.conditions);
                if (insertMatches) {
                    const newData = [...current, item];
                    currentData = applySorting(newData);
                    currentData = applyLimitOffset(currentData);
                    (callback as (data: E[]) => void)(currentData);
                }
                break;
        }
    };

    socket.emit('subscribe', {
        collection: queryConfig.collection,
        conditions: queryConfig.conditions,
        relations: queryConfig.relations || [],
    }, (result: SocketResult) => {
        if (!result.success) {
            options?.onError?.(new Error(result.error || "Subscription failed"));
            return;
        }

        subscribeId = result.data.id;
        if (queryConfig.debug) {
            console.log("SUBSCRIBE ID", subscribeId);
        }

        socket.emit('execute-query', queryConfig, handleQueryResponse);
        socket.on(`change-${subscribeId}`, handleDatabaseChange);
    });

    return () => {
        if (subscribeId) {
            socket.off(`change-${subscribeId}`, handleDatabaseChange);
            socket.emit('unsubscribe', subscribeId);
        }
    };
}