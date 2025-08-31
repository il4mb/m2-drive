// lib/snapshot.ts
import { socket } from '@/socket';
import { Query } from './query';
import { EntityMap, EntityName } from '@/server/database';
import { QueryType } from '@/server/database/types';

export interface SnapshotOptions {
    onError?: (error: Error) => void;
    onMetadata?: (metadata: { lastUpdate: Date; count: number }) => void;
}

export interface Unsubscribe {
    (): void;
}

// Single-item overload
export function onSnapshot<
    T extends EntityName,
    Q extends 'one',
    E = InstanceType<EntityMap[T]>
>(
    query: Query<T, Q>,
    callback: (data: E | null) => void,
    options?: SnapshotOptions
): Unsubscribe;

// Many-items overload
export function onSnapshot<
    T extends EntityName,
    Q extends 'list',
    E = InstanceType<EntityMap[T]>
>(
    query: Query<T, Q>,
    callback: (data: E[]) => void,
    options?: SnapshotOptions
): Unsubscribe;

// Implementation
export function onSnapshot<
    T extends EntityName,
    Q extends QueryType,
    E = InstanceType<EntityMap[T]>
>(
    query: Query<T, Q>,
    callback: ((data: E | null) => void) | ((data: E[]) => void),
    options?: SnapshotOptions
): Unsubscribe {

    const queryConfig = query.toJSON();
    const isSingle = queryConfig.type == "one";


    let currentData: T[] = [];
    let isSubscribed = true;

    const handleQueryResponse = (response: any) => {

        // console.log(response, isSingle)

        if (!isSubscribed) return;

        if (response.success) {
            // currentData = response.data;

            if (isSingle) {
                // @ts-ignore
                (callback as (data: T) => void)(response.data[0] || null);
            } else {
                (callback as (data: T[]) => void)(response.data);
            }

            options?.onMetadata?.({
                lastUpdate: new Date(),
                count: response.data.length
            });
        } else {
            console.error(response);
            options?.onError?.(new Error(response.error));
        }
    };

    const handleDatabaseChange = (payload: any) => {
        if (!isSubscribed || payload.collection !== queryConfig.collection) return;

        switch (payload.event) {
            case 'INSERT':
                currentData = [...currentData, payload.data];
                break;
            case 'UPDATE':
                currentData = currentData.map(item =>
                    // @ts-ignore
                    item.id === payload.data.id ? { ...item, ...payload.data } : item
                );
                break;
            case 'DELETE':
                // @ts-ignore
                currentData = currentData.filter(item => item.id !== payload.data.id);
                break;
        }

        if (isSingle) {
            // @ts-ignore
            (callback as (data: T) => void)(currentData[0] || null);
        } else {
            (callback as (data: T[]) => void)(currentData);
        }

        options?.onMetadata?.({
            lastUpdate: new Date(),
            count: currentData.length
        });
    };

    // Subscribe to collection and execute initial query
    socket.emit('subscribe-collection', queryConfig.collection);
    socket.emit('execute-query', queryConfig, handleQueryResponse);

    // Listen for database changes
    socket.on('database-change', handleDatabaseChange);

    // Return unsubscribe function
    return () => {
        isSubscribed = false;
        socket.off('database-change', handleDatabaseChange);
        socket.emit('unsubscribe-collection', queryConfig.collection);
    };
}