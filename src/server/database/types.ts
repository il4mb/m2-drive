import { EntityName } from ".";

// server/database/types.ts
export type QueryOperator =
    | '=='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'LIKE'
    | 'ILIKE'
    | 'IN'
    | 'BETWEEN'
    | 'IS_NULL'
    | 'NOT_NULL';

export interface QueryCondition {
    field: string;
    operator: QueryOperator;
    value: any;
    logical?: 'AND' | 'OR';
    
}

export interface OrderBy {
    field: string;
    direction: 'ASC' | 'DESC';
}


export type QueryType = "list" | "one";
export interface QueryConfig {
    collection: EntityName;
    type?: QueryType;
    conditions?: QueryCondition[];
    orderBy?: OrderBy;
    limit?: number;
    offset?: number;
}

export interface QueryResult<T> {
    data: T[];
    count: number;
    total?: number;
}

export interface PaginationOptions {
    page: number;
    pageSize: number;
}

export interface DatabaseError {
    code: string;
    message: string;
    details?: any;
}

// Special value types
export type SpecialValue = '@IsNull' | '@NotNull';

// Type guard for special values
export function isSpecialValue(value: any): value is SpecialValue {
    return typeof value === 'string' && ['@IsNull', '@NotNull'].includes(value);
}