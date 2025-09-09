import { EntityMap, EntityName } from "@/server/database";
import { QueryOperator, QueryConfig, QueryType, QueryCondition } from "@/server/database/types";


export const IsNull = "@IsNull";
export const NotNull = "@IsNotNull";
export const Json = (field: string, ...path: string[]): any => `@Json("${field}".${path.join(".")})`

export class Query<T extends EntityName = EntityName, Q extends QueryType = QueryType, E = InstanceType<EntityMap[T]>> {

    private type: Q;
    private collection: T;
    private conditions: QueryCondition[] = [];
    private limitValue?: number;
    private orderByField?: string;
    private orderDirection: "ASC" | "DESC" = "ASC";
    private joinTable: EntityName[] = [];
    private isDebug: boolean = false;
    private group: any[] = [];

    constructor(collection: T, type: Q) {
        this.collection = collection;
        this.type = type;
    }

    where<K extends keyof E = keyof E>(field: K | string, operator: QueryOperator, value?: any): this {
        this.conditions.push({
            field: field as any,
            operator,
            value,
            logical: "AND"
        });
        return this;
    }

    orWhere<K extends keyof E = keyof E>(field: K | string, operator: QueryOperator, value?: any): this {
        this.conditions.push({
            field: field as any,
            operator,
            value,
            logical: "OR"
        });
        return this;
    }

    orderBy<K extends keyof E = keyof E>(field: K | string, direction: "ASC" | "DESC" = "ASC"): this {
        this.orderByField = field as any;
        this.orderDirection = direction;
        return this;
    }

    groupBy<K extends keyof E = keyof E>(field: K | string) {
        this.group.push(field);
        return this;
    }


    /** Group multiple AND conditions in parentheses */
    bracketWhere(callback: (q: Query<T, Q, E>) => void): this {
        const subQuery = new Query<T, Q, E>(this.collection, this.type);
        callback(subQuery);
        if (subQuery.conditions.length) {
            this.conditions.push({
                logical: "AND",
                children: subQuery.conditions
            } as any);
        }
        return this;
    }

    /** Group multiple AND conditions in parentheses but connect with OR */
    orBracketWhere(callback: (q: Query<T, Q, E>) => void): this {
        const subQuery = new Query<T, Q, E>(this.collection, this.type);
        callback(subQuery);
        if (subQuery.conditions.length) {
            this.conditions.push({
                logical: "OR",
                children: subQuery.conditions
            } as any);
        }
        return this;
    }

    limit(limit: number): this {
        this.limitValue = limit;
        return this;
    }

    relations(entities: EntityName[]) {
        this.joinTable = entities;
        return this;
    }

    debug() {
        this.isDebug = true;
        return this;
    }

    static createFrom<T extends EntityName, Q extends QueryType, E>(source: Query<T, Q, E>): Query<T, Q, E> {
        
        const clone = new Query<T, Q, E>(source.collection, source.type);

        // Copy over private state
        clone.conditions = [...source.conditions];
        clone.limitValue = source.limitValue;
        clone.orderByField = source.orderByField;
        clone.orderDirection = source.orderDirection;
        clone.joinTable = [...source.joinTable];
        clone.isDebug = source.isDebug;
        clone.group = [...source.group];

        return clone;
    }


    toJSON(): QueryConfig {
        return {
            collection: this.collection,
            type: this.type,
            conditions: this.conditions,
            limit: this.limitValue,
            group: this.group,
            relations: this.joinTable,
            orderBy: this.orderByField ? {
                field: this.orderByField,
                direction: this.orderDirection
            } : undefined,
            debug: this.isDebug
        };
    }
}

export const getMany = <T extends EntityName>(collection: T): Query<T, 'list'> => {
    return new Query(collection, "list");
}

export const getOne = <T extends EntityName>(collection: T): Query<T, 'one'> => {
    return new Query(collection, "one").limit(1);
}

export const getCount = <T extends EntityName>(collection: T): Query<T, 'count'> => {
    return new Query(collection, "count").limit(1);
}
