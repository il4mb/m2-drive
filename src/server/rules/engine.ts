// lib/rules/engine.ts
import {
    RuleRequest,
    RuleResult,
    DatabaseRules,
    RuleOperation,
    RuleContext,
    QueryFilter,
    ValidationResult,
    RuleValidator
} from './types';

export class RulesEngine {
    private rules: DatabaseRules;
    private context: RuleContext;

    constructor(rules: DatabaseRules = {}) {
        this.rules = rules;
        this.context = {};
    }

    setContext(context: RuleContext): void {
        this.context = { ...this.context, ...context };
    }

    clearContext(): void {
        this.context = {};
    }

    async validateRequest(
        operation: RuleOperation,
        collection: string,
        data?: Record<string, any>,
        resource?: Record<string, any>,
        query?: any
    ): Promise<RuleResult> {
        const collectionRules = this.rules[collection];
        if (!collectionRules) {
            return {
                allowed: false,
                message: `No rules defined for collection ${collection}`
            };
        }

        const operationRule = collectionRules[operation];
        if (!operationRule) {
            return {
                allowed: false,
                message: `No rules defined for operation ${operation} on ${collection}`
            };
        }

        const request: RuleRequest = {
            operation,
            collection,
            userId: this.context.userId,
            user: this.context.user,
            data,
            resource,
            query,
            timestamp: new Date()
        };

        try {
            if (typeof operationRule === 'function') {
                const result = await operationRule(request);
                // @ts-ignore
                return result;
            }

            return { allowed: false, message: 'Invalid rule definition' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                allowed: false,
                message: `Rule validation error: ${errorMessage}`
            };
        }
    }

    async validateQuery(
        collection: string,
        query: any
    ): Promise<RuleResult> {
        const result = await this.validateRequest('list', collection, undefined, undefined, query);

        if (!result.allowed) {
            return result;
        }

        if (result.filters && result.filters.length > 0) {
            const modifiedQuery = this.applyQueryFilters(query, result.filters);
            return {
                ...result,
                modifiedQuery
            };
        }

        return result;
    }

    private applyQueryFilters(query: any, filters: QueryFilter[]): any {
        if (!query) return { conditions: filters };

        const existingConditions = query.conditions || [];
        const newConditions = [...existingConditions, ...filters];

        return {
            ...query,
            conditions: newConditions
        };
    }

    static createValidator(condition: (req: RuleRequest) => boolean | Promise<boolean>): RuleValidator {
        return async (request: RuleRequest) => {
            try {
                const result = await condition(request);
                return { allowed: result };
            } catch (error) {
                return {
                    allowed: false,
                    message: error instanceof Error ? error.message : 'Validation failed'
                };
            }
        };
    }
}