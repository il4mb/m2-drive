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
    private offsetValue?: number;
    private orderByField?: string;
    private orderDirection: "ASC" | "DESC" = "ASC";
    private relationsTable: EntityName[] = [];
    private joinsTable: QueryConfig['joins'] = [];
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

    offset(offset: number): this {
        this.offsetValue = offset;
        return this;
    }

    relations(entities: EntityName[]) {
        this.relationsTable = entities;
        return this;
    }

    join(entity: EntityName | [EntityName, string], on: string, alias?: string,) {
        const tableName = typeof entity == "string" ? entity : entity[0];
        const tableAlias = alias || typeof entity == "string" ? alias : entity[1];
        this.joinsTable = [...this.joinsTable, { entity: tableName, alias: tableAlias, on }]
        return this;
    }

    debug() {
        this.isDebug = true;
        return this;
    }

    static createFrom<T extends EntityName, Q extends QueryType, E>(source: Query<T, Q, E>): Query<T, Q, E> {

        const clone = new Query<T, Q, E>(source.collection, source.type);

        clone.conditions = [...source.conditions];
        clone.limitValue = source.limitValue;
        clone.orderByField = source.orderByField;
        clone.orderDirection = source.orderDirection;
        clone.joinsTable = source.joinsTable;
        clone.relationsTable = [...source.relationsTable];
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
            offset: this.offsetValue,
            group: this.group,
            joins: this.joinsTable,
            relations: this.relationsTable,
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
