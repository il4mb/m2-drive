// lib/snapshot.ts
import { socket } from '@/socket';
import { Query } from './query';
import { EntityMap, EntityName } from '@/server/database';
import { QueryType } from '@/server/database/types';
import { DatabaseChangePayload } from '@/server/database/types';
import { validateByConditions } from '@/server/database/objectHelper';

export interface SnapshotOptions {
    onError?: (error: Error) => void;
    onMetadata?: (metadata: { lastUpdate: Date; count: number }) => void;
}

export interface Unsubscribe {
    (): void;
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

    const handleQueryResponse = (response: any) => {
        if (response.success) {
            if (isSingle) {
                currentData = response.data || null;
                // @ts-ignore
                (callback as (data: E | null) => void)(currentData);
            } else {
                currentData = response.data || [];
                // @ts-ignore
                (callback as (data: E[]) => void)(currentData);
            }

            options?.onMetadata?.({
                lastUpdate: new Date(),
                count: Array.isArray(currentData) ? currentData.length : (currentData ? 1 : 0)
            });
        } else {
            console.warn(response);
            options?.onError?.(new Error(response.error));
        }
    };

    const handleDatabaseChange = (payload: DatabaseChangePayload) => {
        if (payload.collection != queryConfig.collection) return;
        socket.emit('execute-query', queryConfig, handleQueryResponse);
        options?.onMetadata?.({
            lastUpdate: new Date(),
            count: Array.isArray(currentData) ? currentData.length : (currentData ? 1 : 0)
        });
    };

    socket.emit('subscribe', {
        collection: queryConfig.collection,
        conditions: queryConfig.conditions
    }, (id: string) => {
        subscribeId = id;
        socket.emit('execute-query', queryConfig, handleQueryResponse);
        socket.on(`change-${subscribeId}`, handleDatabaseChange);
    });



    return () => {
        socket.off(`change-${subscribeId}`, handleDatabaseChange);
        socket.emit('unsubscribe', subscribeId);
    };
}
