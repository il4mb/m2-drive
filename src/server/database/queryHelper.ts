import { Brackets, SelectQueryBuilder } from "typeorm";
import { QueryCondition, isSpecialValue } from "@/server/database/types";
import { WhereExpressionBuilder } from "typeorm/browser";

/** Recursive helper to apply conditions with brackets */
export function applyConditions(
    qb: SelectQueryBuilder<any> | WhereExpressionBuilder,
    alias: string,
    conditions: QueryCondition[] = [],
    parentLogical: "AND" | "OR" = "AND"
) {
    if (!conditions.length) return;

    // Wrap the whole group in parentheses
    qb.andWhere(new Brackets((qbInner) => {
        conditions.forEach((cond, idx) => {
            const { field, operator, value, logical, children } = cond;

            // Handle nested children recursively
            if (children && children.length > 0) {
                const childLogical = logical ?? "AND";
                if (childLogical === "OR") {
                    qbInner.orWhere(new Brackets((qbChild) => {
                        applyConditions(qbChild, alias, children, "AND");
                    }));
                } else {
                    qbInner.andWhere(new Brackets((qbChild) => {
                        applyConditions(qbChild, alias, children, "AND");
                    }));
                }
                return;
            }

            // Build qualified field name
            let qualified = field.startsWith("@Json(")
                ? (() => {
                    const pathMatch = field.match(/\@Json\((.*?)\)/);
                    if (!pathMatch?.[1]) throw new Error(`Invalid JSON path: ${field}`);
                    const pathParts = pathMatch[1].split(".");
                    const rootField = pathParts.shift();
                    const jsonPathSql = pathParts.map((p) => `'${p}'`).join("->>");
                    return `${alias}.${rootField}->>${jsonPathSql}`;
                })()
                : `${alias}.${String(field)}`;

            // Special value handlers
            if (value === "@IsNull" || value === "@NotNull") {
                const clause =
                    value === "@IsNull"
                        ? `${qualified} IS NULL`
                        : `${qualified} IS NOT NULL`;
                applyClause(qbInner, idx, logical, clause, {});
                return;
            }

            const paramBase = `p_${idx}_${String(field).replace(/\W+/g, "_")}`;

            // Standard operators
            const opMap: Record<string, string> = {
                "==": "=",
                "!=": "!=",
                ">": ">",
                ">=": ">=",
                "<": "<",
                "<=": "<=",
                LIKE: "LIKE",
                ILIKE: "ILIKE",
            };

            if (operator === "IN") {
                const vals = Array.isArray(value) ? value : [value];
                const clause = `${qualified} IN (:...${paramBase})`;
                applyClause(qbInner, idx, logical, clause, { [paramBase]: vals });
            } else if (operator === "BETWEEN") {
                if (!Array.isArray(value) || value.length !== 2)
                    throw new Error("BETWEEN requires [min, max]");
                const [a, b] = value;
                const clause = `${qualified} BETWEEN :${paramBase}_a AND :${paramBase}_b`;
                applyClause(qbInner, idx, logical, clause, { [`${paramBase}_a`]: a, [`${paramBase}_b`]: b });
            } else {
                const clause = `${qualified} ${opMap[operator] ?? "="} :${paramBase}`;
                applyClause(qbInner, idx, logical, clause, { [paramBase]: value });
            }
        });
    }));
}

/** Helper to apply a single clause with AND/OR */
function applyClause(
    qb: SelectQueryBuilder<any> | WhereExpressionBuilder,
    idx: number,
    logical: "AND" | "OR" | undefined,
    clause: string,
    params: Record<string, any>
) {
    if (idx === 0) qb.where(clause, params);
    else if (logical === "OR") qb.orWhere(clause, params);
    else qb.andWhere(clause, params);
}
