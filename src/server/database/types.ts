// server/database/types.ts
export type DatabaseEvent = "INSERT" | "UPDATE" | "DELETE";

export interface DatabaseChangePayload {
    event: DatabaseEvent;
    collection: string;
    data: any;
    timestamp: Date;
    changes?: Record<string, any>;
    previousData?: any;
}

export interface BroadcastContext {
    user?: any;
    collection: string;
    event: DatabaseEvent;
    data: any;
    previousData?: any;
}

export type BroadcastRule = (context: BroadcastContext) => boolean;



import { EntityName } from ".";
export type QueryOperator =
    | '=='           // Equal
    | '!='           // Not equal
    | '>'            // Greater than
    | '>='           // Greater than or equal
    | '<'            // Less than
    | '<='           // Less than or equal
    | 'LIKE'         // Pattern match (case-sensitive)
    | 'ILIKE'        // Pattern match (case-insensitive)
    | 'NOT LIKE'     // Pattern match (case-sensitive)
    | 'NOT ILIKE'    // Pattern match (case-insensitive)
    | 'REGEXP'
    | 'NOT REGEXP'
    | 'IN'           // Value in list
    | 'NOT IN'       // Value not in list
    | 'BETWEEN'      // Range between
    | 'NOT BETWEEN'  // Range not between
    | 'IS NULL'      // Value is null
    | 'IS NOT NULL'  // Value is not null
    | 'EXISTS'       // Subquery or relation exists
    | 'NOT EXISTS'   // Subquery or relation does not exist
    | 'CONTAINS'     // Array contains value
    | 'NOT CONTAINS' // Array does not contain value
    | 'STARTS WITH'  // String starts with
    | 'ENDS WITH';   // String ends with



export interface QueryCondition {
    field: string;
    operator: QueryOperator;
    value: any;
    logical?: 'AND' | 'OR';
    children?: QueryCondition[];
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
    relations: EntityName[];
    debug?: boolean;
    group?: string[];
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