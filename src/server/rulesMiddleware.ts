import { databaseRules } from "./databaseRules";
import { RulesEngine } from "./rules/engine";
import { RuleOperation, ValidationResult } from "./rules/types";


export class RulesMiddleware {
    private engine: RulesEngine;

    constructor() {
        this.engine = new RulesEngine(databaseRules);
    }

    setUserContext(userId?: string, user?: Record<string, any>): void {
        this.engine.setContext({ userId, user });
    }

    clearUserContext(): void {
        this.engine.clearContext();
    }

    async validateOperation(
        operation: RuleOperation,
        collection: string,
        data?: Record<string, any>,
        resource?: Record<string, any>,
        query?: any
    ): Promise<ValidationResult> {
        
        try {

            const result = await this.engine.validateRequest(operation, collection, data, resource, query);
            if (!result.allowed) {
                return {
                    success: false,
                    error: result.message || 'Permission denied',
                    code: 'PERMISSION_DENIED'
                };
            }

            return { 
                success: true, 
                data: result.modifiedQuery
            }

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Validation failed',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    async validateQuery(collection: string, query: any): Promise<ValidationResult> {
        
        try {

            const result = await this.engine.validateQuery(collection, query);

            if (!result.allowed) {
                return {
                    success: false,
                    error: result.message || 'Query permission denied',
                    code: 'PERMISSION_DENIED'
                };
            }

            return {
                success: true,
                data: result.modifiedQuery || query
            };

        } catch (error) {

            console.log(error)

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Query validation failed',
                code: 'VALIDATION_ERROR'
            };
        }
    }
}

export const rulesMiddleware = new RulesMiddleware();