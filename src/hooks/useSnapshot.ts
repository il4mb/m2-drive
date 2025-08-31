// hooks/useSnapshot.ts
import { CollectionName, Collections, DatabaseChangePayload, DatabaseEvent } from '@/entity/DatabaseChangeSubscriber';
import { socket } from '@/socket';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

type Query<T> = {
    field: keyof T;
    operator: "==" | ">=" | "<=" | "LIKE";
    value: string | undefined | null;
}
interface UseSnapshotOptions<T > {
    collection: CollectionName;
    query?: Query<T>[];
    enabled?: boolean;
    onError?: (error: Error) => void;
    onData?: (event: DatabaseEvent, data: T) => void;
    debounceMs?: number;
}

interface UseSnapshotResult<T> {
    data: T[];
    isConnected: boolean;
    error: string | null;
    refresh: () => void;
    lastUpdate: Date | null;
    isLoading: boolean;
}

export function useSnapshot<T>({
    collection,
    query,
    enabled = true,
    onError,
    onData,
    debounceMs = 100
}: UseSnapshotOptions<T>): UseSnapshotResult<T> {

    const [data, setData] = useState<T[]>([]);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const debounceRef = useRef<NodeJS.Timeout>(null);
    const signatureRef = useRef<string>('');

    // Generate a signature for the current query to detect changes
    const currentSignature = useMemo(() => {
        return JSON.stringify({ collection, query, enabled });
    }, [collection, query, enabled]);

    const connectSocket = useCallback(() => {
        if (!enabled) return;

        try {
            // Set up event listeners
            socket.on('connect', handleConnect);
            socket.on('database-change', handleDatabaseChange);
            socket.on('disconnect', handleDisconnect);
            socket.on('error', handleError);
            socket.on('connect_error', handleConnectError);

            // If already connected, trigger the connect handler
            if (socket.connected) {
                handleConnect();
            }

        } catch (err) {
            const error = err as Error;
            setError(error.message);
            onError?.(error);
        }
    }, [enabled, collection, query, onError, onData]);

    const disconnectSocket = useCallback(() => {
        // Remove event listeners
        socket.off('connect', handleConnect);
        socket.off('database-change', handleDatabaseChange);
        socket.off('disconnect', handleDisconnect);
        socket.off('error', handleError);
        socket.off('connect_error', handleConnectError);

        // Unsubscribe from collection
        socket.emit('unsubscribe-collection', collection);

        setIsConnected(false);
    }, [collection]);

    const handleConnect = useCallback(() => {
        setIsConnected(true);
        setError(null);
        console.log('Snapshot WebSocket connected');

        // Subscribe to collection changes
        socket.emit('subscribe-collection', collection);

        // Execute initial query
        executeQuery();
    }, [collection, query]);

    const handleDatabaseChange = useCallback((payload: DatabaseChangePayload) => {
        if (payload.collection === collection) {
            // Debounce rapid changes
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                setLastUpdate(new Date());

                switch (payload.event) {
                    case 'INSERT':
                        setData(prev => [...prev, payload.data]);
                        break;
                    case 'UPDATE':
                        setData(prev => prev.map(item =>
                            item.id === payload.data.id ? { ...item, ...payload.data } : item
                        ));
                        break;
                    case 'DELETE':
                        setData(prev => prev.filter(item => item.id !== payload.data.id));
                        break;
                }

                onData?.(payload.event, payload.data);
            }, debounceMs);
        }
    }, [collection, onData, debounceMs]);

    const handleDisconnect = useCallback(() => {
        setIsConnected(false);
        console.log('Snapshot WebSocket disconnected');
    }, []);

    const handleError = useCallback((error: any) => {
        setError(error.message);
        onError?.(error);
    }, [onError]);

    const handleConnectError = useCallback((error: any) => {
        setError(`Connection error: ${error.message}`);
        onError?.(error);
    }, [onError]);

    const executeQuery = useCallback(() => {
        if (!query) return;

        setIsLoading(true);
        socket.emit('execute-query', { collection, conditions: query }, (response: any) => {
            setIsLoading(false);
            if (response.success) {
                setData(response.data);
                setLastUpdate(new Date());
                setError(null);
            } else {
                setError(response.error);
                onError?.(new Error(response.error));
            }
        });
    }, [collection, query, onError]);

    const refresh = useCallback(() => {
        executeQuery();
    }, [executeQuery]);

    useEffect(() => {
        // Only reconnect if the signature changed
        if (signatureRef.current !== currentSignature) {
            signatureRef.current = currentSignature;

            if (enabled) {
                connectSocket();
            } else {
                disconnectSocket();
            }
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [currentSignature, enabled, connectSocket, disconnectSocket]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnectSocket();
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [disconnectSocket]);

    return {
        data,
        isConnected,
        error,
        refresh,
        lastUpdate,
        isLoading
    };
}