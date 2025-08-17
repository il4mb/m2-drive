"use client"

// Store.ts
import { isEqual } from "lodash";
import { DefaultType, DefineStore } from "./IDBM";
import { Query } from "./Query";

type Operator = "==" | "!=" | ">=" | "<=" | "<>" | "in" | "includes";
type OperatorValue<TV, O extends Operator> =
    O extends "==" ? TV :
    O extends "!=" ? TV :
    O extends ">=" ? TV :
    O extends "<=" ? TV :
    O extends "<>" ? TV :
    O extends "in" ? TV[] :
    O extends "includes" ? TV :
    never;

type KeyToPath<K> = K extends string
    ? IDBValidKey
    : K extends readonly (infer KP)[]
    ? { [P in KP & string]: IDBValidKey } : IDBValidKey;

type EventUpdateData<
    T extends DefaultType,
    O extends DefineStore<T>,
    KPath extends KeyToPath<O['key']> = KeyToPath<O['key']>
> = {
    key: KPath;
    old: T;
    new: T
};

type EventAddData<
    T extends DefaultType,
    O extends DefineStore<T>,
    KPath extends KeyToPath<O['key']> = KeyToPath<O['key']>
> = {
    key: KPath;
    data: T
};

type EventDeleteData<
    T extends DefaultType,
    O extends DefineStore<T>,
    KPath extends KeyToPath<O['key']> = KeyToPath<O['key']>
> = {
    key: KPath;
    data: T
};

type EventClearData = {};
type EventAnyData<T extends DefaultType, N extends EventName, O extends DefineStore<T>> = {
    origin: Omit<N, 'any'>;
    args: EventPayloadMap<T, N, O>[N]
};
type EventName = "update" | "add" | "clear" | "delete" | "any";

type EventPayloadMap<T extends DefaultType, N extends EventName, O extends DefineStore<T>> = {
    update: EventUpdateData<T, O>;
    add: EventAddData<T, O>;
    delete: EventDeleteData<T, O>;
    clear: EventClearData;
    any: EventAnyData<T, N, O>;
};

type EventListener<T extends DefaultType, N extends EventName, O extends DefineStore<T>> = (
    data: EventPayloadMap<T, N, O>[N],
    event: N
) => void;




export class Store<
    T extends DefaultType,
    O extends DefineStore<T>,
    KPath extends KeyToPath<O['key']> = KeyToPath<O['key']>> {

    private eventListeners = new Map<EventName, Set<EventListener<T, EventName, O>>>();
    private dbPromise: Promise<IDBDatabase>;
    private storeName: string;
    private option: O & { autoTimestamps?: boolean };

    constructor(dbPromise: Promise<IDBDatabase>, storeName: string, option: O & { autoTimestamps?: boolean }) {
        this.dbPromise = dbPromise;
        this.storeName = storeName;
        this.option = option;
    }

    // Event handling methods
    on<N extends EventName>(name: N, callback: EventListener<T, EventName, O>): () => void {
        if (!this.eventListeners.has(name)) {
            this.eventListeners.set(name, new Set());
        }
        const listeners = this.eventListeners.get(name)!;
        listeners.add(callback);
        return () => this.off(name, callback);
    }

    off<N extends EventName>(name: N, callback: EventListener<T, EventName, O>): void {
        this.eventListeners.get(name)?.delete(callback);
    }

    private emit<N extends EventName>(name: N, data: EventPayloadMap<T, N, O>[N]): void {
        this.notifyEventListeners(name, data as any);
        if (name !== 'any') {
            const anyPayload: EventAnyData<T, N, O> = {
                origin: name,
                args: data,
            };
            this.notifyEventListeners('any', anyPayload as any);
        }
    }


    private notifyEventListeners<N extends EventName>(name: N, data: EventPayloadMap<T, N, O>[N]): void {
        const listeners = this.eventListeners.get(name);
        if (listeners) {
            // Use queueMicrotask to avoid blocking the main thread
            queueMicrotask(() => {
                listeners.forEach(callback => {
                    try {
                        callback(data, name);
                    } catch (error) {
                        console.error(`Error in ${name} event listener:`, error);
                    }
                });
            });
        }
    }

    // Core store methods
    private async getStore(mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> {
        const db = await this.dbPromise;
        const tx = db.transaction(this.storeName, mode);

        tx.onerror = (event) => {
            const error = (event.target as IDBRequest).error;
            console.error('Transaction error:', error);
            throw error;
        };

        return tx.objectStore(this.storeName);
    }

    async index(name: keyof O['index']): Promise<IDBIndex> {
        const store = await this.getStore();
        return store.index(name as string);
    }

    private getKeysFromObject(value: T): KPath | null {
        const defKeys = this.option.key || 'id';
        if (Array.isArray(defKeys)) {
            const result = {} as any;
            for (const key of defKeys) {
                result[key] = value[key] ?? null;
            }
            return result as KPath;
        } else {
            return (value[defKeys] || null) as KPath;
        }
    }

    private assignObjectKeys(obj: T, key?: KPath): T {
        if (!key) return obj;
        const defKeys = this.option.key || 'id';
        if (Array.isArray(defKeys)) {
            return { ...obj, ...(key as any || {}) } as T;
        } else {
            return { ...obj, ...({ [defKeys]: key }) } as T;
        }
    }

    private removeObjectKeys(obj: T): T {
        const defKeys = this.option.key || 'id';

        if (Array.isArray(defKeys)) {
            const newObj = { ...obj };
            for (const key of defKeys) {
                delete newObj[key];
            }
            return newObj;
        } else {
            const { [defKeys]: _, ...rest } = obj;
            return rest as T;
        }
    }


    async add(value: T, key?: KPath): Promise<IDBValidKey> {

        const id = key ?? this.getKeysFromObject(value) ?? null;
        const exist = id ? await this.get(id) : false;

        if (exist && id) {
            await this.update(id, value);
            return id as IDBValidKey;
        }

        const dataToStore = this.assignObjectKeys(value, key);
        const store = await this.getStore("readwrite");

        return new Promise((resolve, reject) => {
            const req = this.option.key ? store.put(dataToStore) : store.add(dataToStore);

            req.onsuccess = () => {
                const resultId = req.result as any;
                this.emit('add', { key: resultId, data: value });
                resolve(resultId);
            };

            req.onerror = (event) => {
                const error = (event.target as IDBRequest).error;
                reject(error);
            };
        });
    }

    async bulkAdd(values: T[], ids?: KPath[]): Promise<IDBValidKey[]> {
        const db = await this.dbPromise;
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);

        const results: IDBValidKey[] = [];

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(results);
            tx.onerror = () => reject(tx.error);

            (async () => {
                try {
                    for (let i = 0; i < values.length; i++) {
                        const value = values[i];
                        const id = ids?.[i];
                        const data = id ? this.assignObjectKeys(value, id) : value;
                        const req = this.option.key ? store.put(data) : store.add(data);

                        await new Promise<void>((res, rej) => {
                            req.onsuccess = () => {
                                results.push(req.result as IDBValidKey);
                                this.emit("add", { key: req.result as any, data: value });
                                res();
                            };
                            req.onerror = () => {
                                rej(req.error);
                            };
                        });
                    }
                } catch (err) {
                    tx.abort();
                    reject(err);
                }
            })();
        });
    }

    async update(key: KPath, updates: Partial<T>): Promise<boolean> {

        const existing = await this.get(key);
        if (!existing) throw new Error(`Record with id ${key} not found`);
        const merged = this.assignObjectKeys({ ...existing, ...updates }, key);

        if (isEqual(existing, merged)) return true;

        const store = await this.getStore("readwrite");
        return new Promise((resolve) => {
            const req = store.put(merged);
            req.onsuccess = () => {
                this.emit('update', { key: key as any, old: existing, new: merged });
                resolve(true);
            };
            req.onerror = () => resolve(false);
        });
    }

    get(key: KPath): Promise<T | undefined>;
    get(key: KPath, callback: (data: T | undefined) => void): () => void;
    get(key: KPath, callback?: (data: T | undefined) => void): any {
        if (callback) {
            // Call initial value
            this.get(key).then(callback);

            const unsubscribe = this.on('any', (args, origin) => {
                // @ts-ignore
                if (origin === 'update' || origin === 'delete') {
                    // @ts-ignore
                    const eventData = args as EventUpdateData<T> | EventDeleteData<T>;
                    if (eventData.id === key) {
                        if (origin === 'update') {
                            callback((eventData as EventUpdateData<T, O, KPath>).new.data);
                        } else {
                            callback(undefined);
                        }
                    }
                }
            });

            return unsubscribe;
        }

        // If no callback provided, do one-time read
        return this.getStore().then(store => {
            return new Promise<T | undefined>((resolve, reject) => {
                const req = store.get(this.realKey(key));
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(undefined);
            });
        });
    }

    getBy<K extends keyof T>(field: K, value: T[K]): Promise<T | undefined>;
    getBy<K extends keyof T>(field: K, value: T[K], callback: (data: T | undefined) => void): () => void;
    getBy<K extends keyof T>(field: K, value: T[K], callback?: (data: T | undefined) => void): any {
        if (callback) {
            // Initial query
            // @ts-ignore
            this.getBy(field, value).then(callback);

            const unsubscribe = this.on('any', (args, origin) => {
                if (origin === 'update' || origin === 'delete') {
                    const eventData = args as EventUpdateData<T, O> | EventDeleteData<T, O>;
                    const item = origin === 'update'
                        ? (eventData as EventUpdateData<T, O>).new.data
                        : undefined;

                    if (item && item[field] === value) {
                        callback(item);
                        // @ts-ignore
                    } else if (origin === 'delete' && eventData.old.data[field] === value) {
                        callback(undefined);
                    }
                }
            });

            return unsubscribe;
        }

        return this.getStore().then(store => {
            return new Promise<T | undefined>((resolve, reject) => {
                const request = store.openCursor();
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (cursor) {
                        const item = cursor.value as T;
                        if (item[field] === value) {
                            resolve(item);
                            return;
                        }
                        cursor.continue();
                    } else {
                        resolve(undefined);
                    }
                };
                request.onerror = () => resolve(undefined);
            });
        });
    }


    private realKey(key: KPath): IDBValidKey {
        if (typeof key == "object") {
            const defKeys = this.option.key as string[];
            return defKeys.map(k => (key as any)[k] as any);
        }
        return key as IDBValidKey;
    }

    async getAll(): Promise<T[]>;
    async getAll<K extends keyof T, P extends Operator>(
        key: K,
        operator: P,
        value: OperatorValue<T[K], P>
    ): Promise<T[]>;
    async getAll<K extends keyof T, P extends Operator>(key?: K, operator?: P, value?: OperatorValue<T[K], P>): Promise<T[]> {
        const store = await this.getStore();

        // If no filter: return all
        if (!key || !operator || value === undefined) {
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        const results: T[] = [];

        return new Promise((resolve, reject) => {
            const cursorReq = store.openCursor();

            cursorReq.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (!cursor) {
                    return resolve(results);
                }

                const record = cursor.value as T;
                const val = record[key];

                let match = false;
                switch (operator) {
                    case "==":
                        match = val === value;
                        break;
                    case "<>":
                        match = val !== value;
                        break;
                    case ">=":
                        // @ts-ignore
                        match = val >= value;
                        break;
                    case "<=":
                        // @ts-ignore
                        match = val <= value;
                        break;
                    case "in":
                        match = (value as any[]).includes(val);
                        break;
                    case "includes":
                        match = Array.isArray(val) && val.includes(value);
                        break;
                }

                if (match) results.push(record);
                cursor.continue();
            };

            cursorReq.onerror = () => reject(cursorReq.error);
        });
    }



    async delete(key: KPath): Promise<void> {
        const existing = await this.get(key);
        if (!existing) {
            throw new Error(`Record with id ${key} not found`);
        }

        const store = await this.getStore("readwrite");
        return new Promise((resolve, reject) => {
            const req = store.delete(this.realKey(key));
            req.onsuccess = () => {
                this.emit('delete', { key: key, data: existing });
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }

    async bulkDelete(keys: KPath[]): Promise<void> {
        const store = await this.getStore("readwrite");

        // First verify all records exist
        const existingRecords = await Promise.all(
            keys.map(async key => {
                const record = await this.get(key);
                if (!record) {
                    throw new Error(`Record with id ${key} not found`);
                }
                return { key, record };
            })
        );

        return new Promise((resolve, reject) => {
            const tx = store.transaction;

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);

            existingRecords.forEach(({ key, record }) => {
                const req = store.delete(this.realKey(key));
                req.onsuccess = () => {
                    this.emit('delete', { key, data: record });
                };
                req.onerror = () => {
                    tx.abort();
                    reject(req.error);
                };
            });
        });
    }

    async clear(): Promise<void> {
        const store = await this.getStore("readwrite");
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => {
                this.emit('clear', {});
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }


    query(): Query<T, O> {
        return new Query(this as any, this.option as any);
    }

    async count(): Promise<number> {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    // Additional utility methods
    async exists(id: IDBValidKey): Promise<boolean> {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const req = store.count(id);
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () => reject(req.error);
        });
    }

    async keys(): Promise<IDBValidKey[]> {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const req = store.getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}