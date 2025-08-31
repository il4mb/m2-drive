// lib/rules/types.ts
export type RuleOperation = 'get' | 'list' | 'create' | 'update' | 'delete';
export type RuleCondition = (request: RuleRequest) => boolean | Promise<boolean>;
export type RuleValidator = (request: RuleRequest) => RuleResult | Promise<RuleResult>;

export interface RuleRequest {
    operation: RuleOperation;
    collection: string;
    userId?: string;
    user?: Record<string, any>;
    resource?: Record<string, any>;
    data?: Record<string, any>;
    query?: any;
    timestamp: Date;
}

export interface RuleResult {
    allowed: boolean;
    message?: string;
    filters?: QueryFilter[];
    modifiedQuery?: any;
}

export interface QueryFilter {
    field: string;
    operator: string;
    value: any;
    logical?: 'AND' | 'OR';
}

export interface CollectionRules {
    get?: RuleCondition | RuleValidator;
    list?: RuleCondition | RuleValidator;
    create?: RuleCondition | RuleValidator;
    update?: RuleCondition | RuleValidator;
    delete?: RuleCondition | RuleValidator;
}

export interface DatabaseRules {
    [collection: string]: CollectionRules;
}

export interface RuleContext {
    userId?: string;
    user?: Record<string, any>;
}

export interface ValidationResult {
    success: boolean;
    data?: any;
    error?: string;
    code?: string;
}