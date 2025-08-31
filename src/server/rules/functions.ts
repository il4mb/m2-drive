// lib/rules/functions.ts
import { RuleRequest, RuleResult } from './types';

export class RuleFunctions {
    static allow(): RuleResult {
        return { allowed: true };
    }

    static deny(message?: string): RuleResult {
        return { allowed: false, message };
    }

    static isAuthenticated(request: RuleRequest): boolean {
        return !!request.userId && !!request.user;
    }

    static isUnauthenticated(request: RuleRequest): boolean {
        return !request.userId;
    }

    static isUser(userIdPath: string = 'userId'): (request: RuleRequest) => boolean {
        return (request: RuleRequest) => {
            if (!request.resource) return false;
            const resourceUserId = this.getNestedValue(request.resource, userIdPath);
            return request.userId === resourceUserId;
        };
    }

    static hasField(field: string): (request: RuleRequest) => boolean {
        return (request: RuleRequest) => {
            return request.data ? field in request.data : false;
        };
    }

    static fieldEquals(field: string, value: any): (request: RuleRequest) => boolean {
        return (request: RuleRequest) => {
            return request.data?.[field] === value;
        };
    }

    static addFilter(field: string, operator: string, value: any): RuleResult {
        return {
            allowed: true,
            filters: [{ field, operator, value }]
        };
    }

    static and(...conditions: Array<(req: RuleRequest) => boolean>): (request: RuleRequest) => boolean {
        return (request: RuleRequest) => {
            return conditions.every(condition => condition(request));
        };
    }

    static or(...conditions: Array<(req: RuleRequest) => boolean>): (request: RuleRequest) => boolean {
        return (request: RuleRequest) => {
            return conditions.some(condition => condition(request));
        };
    }

    private static getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

// Shortcut exports
export const allow = RuleFunctions.allow;
export const deny = RuleFunctions.deny;
export const isAuthenticated = RuleFunctions.isAuthenticated;
export const isUnauthenticated = RuleFunctions.isUnauthenticated;
export const isUser = RuleFunctions.isUser;
export const hasField = RuleFunctions.hasField;
export const fieldEquals = RuleFunctions.fieldEquals;
export const addFilter = RuleFunctions.addFilter;
export const and = RuleFunctions.and;
export const or = RuleFunctions.or;