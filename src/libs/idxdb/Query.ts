"use client"

// Query.ts
import { DefaultType, DefineStore } from "./IDBM";
import { Store } from "./Store";

type IDBValidIndexKey = IDBValidKey | IDBValidKey[];
type LeakStore<T extends DefaultType, O extends DefineStore<T>> = Omit<Store<T, O>, 'getStore'> & { getStore: (mode?: IDBTransactionMode) => Promise<IDBObjectStore> };

export class Query<T extends DefaultType, O extends DefineStore<T>> {

    private conditions: {
        index: keyof NonNullable<O['index']>;
        value: IDBValidIndexKey;
        operator?: '=' | '>' | '>=' | '<' | '<=' | '!=' | 'between';
        range?: [IDBValidKey, IDBValidKey];
    }[] = [];
    private limitValue: number | null = null;
    private offsetValue: number = 0;
    private orderByValue: { index: keyof NonNullable<O['index']>; direction: 'asc' | 'desc' } | null = null;
    private snapshotListeners = new Set<(data: T[]) => void>();
    private async notifySnapshotListeners() {
        this.execute().then(data => {
            this.snapshotListeners.forEach(callback => callback(data));
        })
    }

    constructor(
        private store: LeakStore<T, O>,
        private option: O
    ) { }

    where<K extends keyof NonNullable<O['index']>>(
        index: K,
        value: NonNullable<O['index']>[K] extends (keyof T)[]
            ? Record<NonNullable<O['index']>[K][number], any>
            : IDBValidKey
    ): Query<T, O> {

        // Remove existing condition with the same index
        this.conditions = this.conditions.filter(cond => cond.index !== index);
        const indexed = this.option.index?.[index as any] as string[];

        if (Array.isArray(indexed)) {
            // Compound index
            const keys = indexed as (keyof T)[];
            const keyValues = keys.map(k => (value as Record<keyof T, any>)[k]);

            this.conditions.push({
                index,
                value: keyValues.length === 1 ? keyValues[0] : keyValues,
                operator: '='
            });
        } else {
            // Simple index
            this.conditions.push({
                index,
                value: value as IDBValidKey,
                operator: '='
            });
        }

        this.notifySnapshotListeners().catch(console.error);
        return this;
    }


    whereGreaterThan<K extends keyof NonNullable<O['index']>>(index: K, value: IDBValidKey): Query<T, O> {
        this.conditions.push({ index, value, operator: '>' });
        return this;
    }

    whereGreaterThanOrEqual<K extends keyof NonNullable<O['index']>>(index: K, value: IDBValidKey): Query<T, O> {
        this.conditions.push({ index, value, operator: '>=' });
        return this;
    }

    whereLessThan<K extends keyof NonNullable<O['index']>>(index: K, value: IDBValidKey): Query<T, O> {
        this.conditions.push({ index, value, operator: '<' });
        return this;
    }

    whereLessThanOrEqual<K extends keyof NonNullable<O['index']>>(index: K, value: IDBValidKey): Query<T, O> {
        this.conditions.push({ index, value, operator: '<=' });
        return this;
    }

    whereNotEqual<K extends keyof NonNullable<O['index']>>(index: K, value: IDBValidKey): Query<T, O> {
        this.conditions.push({ index, value, operator: '!=' });
        return this;
    }

    whereBetween<K extends keyof NonNullable<O['index']>>(index: K, lower: IDBValidKey, upper: IDBValidKey): Query<T, O> {
        this.conditions.push({
            index,
            value: lower,
            operator: 'between',
            range: [lower, upper]
        });
        return this;
    }

    limit(count: number): Query<T, O> {
        this.limitValue = count;
        return this;
    }

    offset(count: number): Query<T, O> {
        this.offsetValue = count;
        return this;
    }

    orderBy<K extends keyof T>(index: K, direction: 'asc' | 'desc' = 'asc'): Query<T, O> {
        this.orderByValue = { index, direction } as any;
        return this;
    }

    async execute(): Promise<T[]> {
        if (!this.conditions.length) {
            return this.getAll();
        }

        return new Promise((resolve, reject) => {
            const results: T[] = [];
            let cursorRequest: IDBRequest<IDBCursorWithValue | null>;

            this.store.index(this.conditions[0].index as any).then(index => {

                const condition = this.conditions[0];
                let keyRange: IDBKeyRange | null = null;
                const isByNull = condition.value == null;

                if (isByNull) {
                    const keyPaths = Array.isArray(index.keyPath) ? index.keyPath : [index.keyPath];

                    this.getAll().then(all => {
                        const filtered = all.filter(obj =>
                            keyPaths.every(path => obj[path] === null || obj[path] === undefined)
                        );
                        resolve(filtered);
                    }).catch(reject);
                    return; 
                }

                switch (condition.operator) {
                    case '=':
                        keyRange = IDBKeyRange.only(condition.value);
                        break;
                    case '>':
                        keyRange = IDBKeyRange.lowerBound(condition.value, true);
                        break;
                    case '>=':
                        keyRange = IDBKeyRange.lowerBound(condition.value);
                        break;
                    case '<':
                        keyRange = IDBKeyRange.upperBound(condition.value, true);
                        break;
                    case '<=':
                        keyRange = IDBKeyRange.upperBound(condition.value);
                        break;
                    case '!=':
                        keyRange = null;
                        break;
                    case 'between':
                        keyRange = IDBKeyRange.bound(condition.range![0], condition.range![1]);
                        break;
                    default:
                        keyRange = IDBKeyRange.only(condition.value);
                }
                const direction = this.orderByValue?.direction === 'desc' ? 'prev' : 'next';
                cursorRequest = keyRange
                    ? index.openCursor(keyRange, direction)
                    : index.openCursor(null, direction);

                let count = 0;
                let skipped = 0;

                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (!cursor) {
                        resolve(results);
                        return;
                    }

                    // Apply not equal filter if needed
                    if (condition.operator === '!=' && cursor.key === condition.value) {
                        cursor.continue();
                        return;
                    }

                    // Handle offset
                    if (skipped < this.offsetValue) {
                        skipped++;
                        cursor.continue();
                        return;
                    }

                    // Handle limit
                    if (this.limitValue !== null && count >= this.limitValue) {
                        resolve(results);
                        return;
                    }

                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                };

                cursorRequest.onerror = () => reject(cursorRequest.error);
            }).catch(reject);
        });
    }

    async first(): Promise<T | undefined> {
        const results = await this.limit(1).execute();
        return results[0];
    }

    async count(): Promise<number> {
        if (!this.conditions.length) {
            const store = await this.store.getStore();
            return new Promise((resolve, reject) => {
                const req = store.count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        return new Promise((resolve, reject) => {
            this.store.index(this.conditions[0].index as any).then(index => {
                const condition = this.conditions[0];
                let keyRange: IDBKeyRange | null = null;

                if (condition.operator === '=') {
                    keyRange = IDBKeyRange.only(condition.value);
                } else if (condition.operator === 'between') {
                    keyRange = IDBKeyRange.bound(condition.range![0], condition.range![1]);
                }

                const req = keyRange ? index.count(keyRange) : index.count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            }).catch(reject);
        });
    }

    private async getAll(): Promise<T[]> {
        const store = await this.store.getStore();
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    onSnapshot(callback: (data: T[]) => void): () => void {
        // Add to listeners
        this.snapshotListeners.add(callback);
        this.notifySnapshotListeners().catch(console.error);

        // Also listen to store changes
        const storeUnsubscribe = this.store.on('any', () => {
            this.notifySnapshotListeners().catch(console.error);
        });

        // Return unsubscribe function
        return () => {
            this.snapshotListeners.delete(callback);
            storeUnsubscribe();
        };
    }
}