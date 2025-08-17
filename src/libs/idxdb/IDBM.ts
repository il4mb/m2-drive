"use client"

import { Store } from "./Store";

export type DefaultType = {
    [key: string]: any;
}

export interface DefineStore<T, I extends string = string> {
    key?: (keyof T) | (keyof T)[];
    autoIncrement?: boolean;
    index?: {
        [K in I]: (keyof T)[];
    };
}

export type StoreDefineProps<C> = {
    [K in keyof C]: DefineStore<C[K], any>;
};

export type IDB<S, Opts extends StoreDefineProps<S>> = {
    // @ts-ignore
    [K in keyof S]: Store<S[K], Opts[K]>;
}

export class IDBM<S extends Record<string, any>, D extends StoreDefineProps<S> = StoreDefineProps<S>> {
    private dbPromise: Promise<IDBDatabase> | null = null;
    private dbName: string;
    private version: number;
    private storeCache: Record<string, any> = {};

    constructor(dbName: string, version = 1) {
        this.dbName = dbName;
        this.version = version;
    }

    init<Opts extends D>(options: Opts): IDB<S, Opts> {

        this.dbPromise = this.initDB(options);
        return new Proxy(this, {
            get: (target, storeName: string) => {
                if (typeof storeName === 'string' && storeName in options) {
                    if (!this.storeCache[storeName]) {
                        this.storeCache[storeName] = new Store<S[typeof storeName], Opts[typeof storeName]>(
                            target.dbPromise!,
                            storeName,
                            options[storeName] as any
                        );
                    }
                    return this.storeCache[storeName];
                }
                return Reflect.get(target, storeName);
            }
        }) as unknown as IDB<S, Opts>;
    }

    private initDB(options: D): Promise<IDBDatabase> {

        return new Promise((resolve, reject) => {
            
            if (typeof window === "undefined") return;

            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const storeName in options) {
                    const config = options[storeName];
                    const keyPath = (config.key ?? 'id') as string | string[];
                    const autoIncrement = config.autoIncrement ?? false;

                    if (db.objectStoreNames.contains(storeName)) {
                        db.deleteObjectStore(storeName);
                    }
                    const store = db.createObjectStore(storeName, { keyPath, autoIncrement });

                    if (config.index) {
                        for (const indexKey in config.index) {
                            const keys = config.index[indexKey] as string[];
                            store.createIndex(
                                indexKey,
                                keys.length === 1 ? keys[0] : keys,
                                { unique: false }
                            );
                        }
                    }
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Utility methods
    async close(): Promise<void> {
        const db = await this.dbPromise;
        db?.close();
    }

    async deleteDatabase(): Promise<void> {
        await this.close();
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}