import { EntityMap, EntityName } from "@/server/database";
import { QueryOperator, QueryCondition, QueryConfig, QueryType } from "@/server/database/types";


export const IsNull = "@IsNull";
export const NotNull = "@IsNotNull";
export const Json = (field: string, ...path: string[]): any => `@Json(${field}.${path.join(".")})`

export class Query<T extends EntityName, Q extends QueryType, E = InstanceType<EntityMap[T]>> {

    private type: Q;
    private collection: T;
    private conditions: QueryCondition[] = [];
    private limitValue?: number;
    private orderByField?: string;
    private orderDirection: "ASC" | "DESC" = "ASC";

    constructor(collection: T, type: Q) {
        this.collection = collection;
        this.type = type;
    }

    where(field: keyof E, operator: QueryOperator, value: any): this {
        this.conditions.push({
            field: field as any,
            operator, value,
            logical: "AND"
        });
        return this;
    }

    orWhere(field: keyof E, operator: QueryOperator, value: any): this {
        this.conditions.push({
            field: field as any,
            operator,
            value,
            logical: "OR"
        });
        return this;
    }

    limit(limit: number): this {
        this.limitValue = limit;
        return this;
    }

    orderBy(field: keyof E, direction: "ASC" | "DESC" = "ASC"): this {
        this.orderByField = field as any;
        this.orderDirection = direction;
        return this;
    }

    toJSON(): QueryConfig {
        return {
            collection: this.collection,
            type: this.type,
            conditions: this.conditions,
            limit: this.limitValue,
            orderBy: this.orderByField ? {
                field: this.orderByField,
                direction: this.orderDirection
            } : undefined
        }
    }
}

export const getMany = <T extends EntityName>(collection: T): Query<T, 'list'> => {
    return new Query(collection, "list");
}

export const getOne = <T extends EntityName>(collection: T): Query<T, 'one'> => {
    return new Query(collection, "one").limit(1);
}