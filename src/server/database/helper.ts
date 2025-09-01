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


/** Handle JSON path resolution for object fields */
function resolveFieldValue<T extends Record<string, any>>(obj: T, field: string): any {
    if (!field) return undefined;

    // Handle JSON path
    if (field.startsWith("@Json(")) {
        const pathMatch = field.match(/\@Json\((.*?)\)/);
        if (!pathMatch?.[1]) return undefined;

        const pathParts = pathMatch[1].split(".");
        let currentValue: any = obj;

        for (const part of pathParts) {
            if (currentValue === null || currentValue === undefined) {
                return undefined;
            }
            // Check if the property exists before accessing it
            if (!(part in currentValue)) {
                return undefined;
            }
            currentValue = currentValue[part];
        }
        return currentValue;
    }

    // Check if the field exists in the object
    if (!(field in obj)) {
        return undefined;
    }

    return obj[field as keyof T];
}

/** Evaluate a single condition against an object */
function evaluateCondition<T extends Record<string, any>>(obj: T, condition: QueryCondition): boolean {
    const { field, operator, value } = condition;
    const actualValue = resolveFieldValue(obj, field);

    // Handle special values first
    if (isSpecialValue(value)) {
        return value === "@IsNull"
            ? actualValue === null || actualValue === undefined
            : actualValue !== null && actualValue !== undefined;
    }

    // Operator handling
    switch (operator) {
        case "==":
            return actualValue === value;

        case "!=":
            return actualValue !== value;

        case ">":
            return actualValue > value;

        case ">=":
            return actualValue >= value;

        case "<":
            return actualValue < value;

        case "<=":
            return actualValue <= value;

        case "LIKE":
            return typeof actualValue === "string" &&
                typeof value === "string" &&
                actualValue.includes(value);

        case "ILIKE":
            return typeof actualValue === "string" &&
                typeof value === "string" &&
                actualValue.toLowerCase().includes(value.toLowerCase());

        case "IN":
            return Array.isArray(value) && value.includes(actualValue);

        case "BETWEEN":
            if (!Array.isArray(value) || value.length !== 2) {
                return false;
            }
            const [min, max] = value;
            return actualValue >= min && actualValue <= max;

        default:
            return actualValue === value;
    }
}

/** Enhanced recursive validator with proper bracket handling */
export function validateByConditionsRecursive<T extends Record<string, any>>(
    obj: T,
    conditions: QueryCondition[] = []
): boolean {
    if (!conditions.length) return true;

    let finalResult: boolean | null = null;
    let currentLogical: 'AND' | 'OR' = 'AND';

    for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];

        let conditionResult: boolean;

        // Handle nested conditions (brackets)
        if (condition.children && condition.children.length > 0) {
            conditionResult = validateByConditionsRecursive(obj, condition.children);
        } else {
            conditionResult = evaluateCondition(obj, condition);
        }

        // Determine the logical operator to use
        const logicalOperator = condition.logical || (i === 0 ? 'AND' : currentLogical);

        // Apply the logical operation
        if (finalResult === null) {
            finalResult = conditionResult;
        } else {
            if (logicalOperator === 'AND') {
                finalResult = finalResult && conditionResult;
            } else {
                finalResult = finalResult || conditionResult;
            }
        }

        // Update current logical operator for the next condition
        currentLogical = condition.logical || currentLogical;
    }

    return finalResult ?? true;
}