import { QueryCondition } from "./types";

/** Special value tokens for null checks */
const SPECIAL_VALUES = {
    "@IsNull": "@IsNull",
    "@NotNull": "@NotNull",
} as const;

type SpecialValue = keyof typeof SPECIAL_VALUES;

function isSpecialValue(v: unknown): v is SpecialValue {
    return typeof v === "string" && (v === "@IsNull" || v === "@NotNull");
}

/** Handle field name resolution (remove $ prefix if present) */
function resolveFieldName(field: string): string {
    return field.startsWith('$') ? field.substring(1) : field;
}


/** Handle JSON path resolution for object fields */
function resolveFieldValue<T extends Record<string, any>>(obj: T, field: string): any {
    if (!field) return undefined;

    const resolvedField = resolveFieldName(field);

    // Handle JSON path syntax: @Json("field.path.to.value")
    if (resolvedField.startsWith("@Json(")) {
        const pathMatch = resolvedField.match(/\@Json\((.*?)\)/);
        if (!pathMatch?.[1]) return undefined;

        // Extract and clean the path (remove quotes, handle different formats)
        let jsonPath = pathMatch[1].replace(/^["']|["']$/g, '');

        // Handle different formats: "meta".trashed or meta.trashed
        jsonPath = jsonPath.replace(/\"\./g, '.').replace(/\.\"/g, '.');

        const pathParts = jsonPath.split(".");

        let currentValue: any = obj;

        for (const part of pathParts) {
            if (currentValue === null || currentValue === undefined) {
                return undefined;
            }

            // Handle array indices if needed
            if (Array.isArray(currentValue) && !isNaN(Number(part))) {
                currentValue = currentValue[Number(part)];
            } else if (typeof currentValue === 'object' && part in currentValue) {
                currentValue = currentValue[part];
            } else {
                return undefined;
            }
        }
        return currentValue;
    }

    // Handle dot notation for nested properties (like $file.aa)
    if (resolvedField.includes('.')) {
        const pathParts = resolvedField.split('.');
        let currentValue: any = obj;

        for (const part of pathParts) {
            if (currentValue === null || currentValue === undefined) {
                return undefined;
            }

            if (Array.isArray(currentValue) && !isNaN(Number(part))) {
                currentValue = currentValue[Number(part)];
            } else if (typeof currentValue === 'object' && part in currentValue) {
                currentValue = currentValue[part];
            } else {
                return undefined;
            }
        }
        return currentValue;
    }

    // Direct field access
    if (resolvedField in obj) {
        return obj[resolvedField];
    }

    return undefined;
}

/** Evaluate a single condition against an object */
function evaluateCondition<T extends Record<string, any>>(obj: T, condition: QueryCondition): boolean {
    const { field, operator, value } = condition;
    const actualValue = resolveFieldValue(obj, field);

    // Handle NULL/IS NULL/IS NOT NULL operators
    if (operator === 'IS NULL') {
        return actualValue === null || actualValue === undefined;
    }

    if (operator === 'IS NOT NULL') {
        return actualValue !== null && actualValue !== undefined;
    }

    // Handle special values (@IsNull, @NotNull)
    if (isSpecialValue(value)) {
        return value === "@IsNull"
            ? actualValue === null || actualValue === undefined
            : actualValue !== null && actualValue !== undefined;
    }

    // Handle null/undefined actual values for non-null operators
    if (actualValue === null || actualValue === undefined) {
        // For most operators, null comparison should return false
        // Except for equality/inequality with null
        if (operator === '==') return actualValue === value;
        if (operator === '!=') return actualValue !== value;
        return false;
    }

    // Operator handling
    switch (operator) {
        case "==":
            return actualValue == value;

        case "!=":
            return actualValue != value;

        case ">":
            return actualValue > value;

        case ">=":
            return actualValue >= value;

        case "<":
            return actualValue < value;

        case "<=":
            return actualValue <= value;

        case "LIKE":
        case "STARTS WITH": // STARTS WITH is a special case of LIKE
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            if (operator === "STARTS WITH") {
                return actualValue.startsWith(value);
            }
            return actualValue.includes(value);

        case "ILIKE":
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            return actualValue.toLowerCase().includes(value.toLowerCase());

        case "NOT LIKE":
        case "ENDS WITH": // ENDS WITH could be considered a special case
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            if (operator === "ENDS WITH") {
                return actualValue.endsWith(value);
            }
            return !actualValue.includes(value);

        case "NOT ILIKE":
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            return !actualValue.toLowerCase().includes(value.toLowerCase());

        case "IN":
            return Array.isArray(value) && value.includes(actualValue);

        case "NOT IN":
            return Array.isArray(value) && !value.includes(actualValue);

        case "BETWEEN":
            if (!Array.isArray(value) || value.length !== 2) return false;
            return actualValue >= value[0] && actualValue <= value[1];

        case "NOT BETWEEN":
            if (!Array.isArray(value) || value.length !== 2) return false;
            return actualValue < value[0] || actualValue > value[1];

        case "REGEXP":
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            try {
                return new RegExp(value).test(actualValue);
            } catch {
                return false; // Invalid regex
            }

        case "NOT REGEXP":
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            try {
                return !new RegExp(value).test(actualValue);
            } catch {
                return false; // Invalid regex
            }

        case "CONTAINS":
            if (!Array.isArray(actualValue)) return false;
            return actualValue.includes(value);

        case "NOT CONTAINS":
            if (!Array.isArray(actualValue)) return false;
            return !actualValue.includes(value);

        case "EXISTS":
            // For object validation, EXISTS means the field exists and has a value
            return actualValue !== null && actualValue !== undefined;

        case "NOT EXISTS":
            // For object validation, NOT EXISTS means the field doesn't exist or is null/undefined
            return actualValue === null || actualValue === undefined;

        case "STARTS WITH":
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            return actualValue.startsWith(value);

        case "ENDS WITH":
            if (typeof actualValue !== "string" || typeof value !== "string") return false;
            return actualValue.endsWith(value);

        default:
            return false;
    }
}

/** Enhanced recursive validator with proper bracket handling */
function validateByConditionsRecursive<T extends Record<string, any>>(
    obj: T,
    conditions: QueryCondition[] = [],
    parentLogical: "AND" | "OR" = "AND"
): boolean {
    if (!conditions.length) return true;

    // Process conditions in groups based on logical operators and brackets
    let result: boolean | null = null;
    let currentLogical: "AND" | "OR" = parentLogical;

    for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        const logicalOperator = condition.logical || (i === 0 ? "AND" : currentLogical);

        let conditionResult: boolean;

        // Handle nested conditions (brackets)
        if (condition.children && condition.children.length > 0) {
            // For nested conditions, use the condition's logical operator or inherit from parent
            const childLogical = condition.logical || currentLogical;
            conditionResult = validateByConditionsRecursive(obj, condition.children, childLogical);
        } else {
            conditionResult = evaluateCondition(obj, condition);
        }

        // Apply the logical operation
        if (result === null) {
            result = conditionResult;
        } else {
            if (logicalOperator === "AND") {
                result = result && conditionResult;
            } else {
                result = result || conditionResult;
            }
        }

        // Update current logical operator for the next condition
        currentLogical = condition.logical || currentLogical;

        // Short-circuit evaluation for AND/OR
        if (logicalOperator === "AND" && result === false) {
            // If AND fails, no need to check further
            break;
        } else if (logicalOperator === "OR" && result === true) {
            // If OR succeeds, no need to check further
            break;
        }
    }

    return result ?? true;
}

/** Main validation function with proper bracket grouping */
export function validateByConditions<T extends Record<string, any>>(
    obj: T,
    conditions: QueryCondition[] = []
): boolean {
    if (!conditions.length) return true;

    // Wrap the entire condition set in a virtual bracket group
    return validateByConditionsRecursive(obj, conditions, "AND");
}