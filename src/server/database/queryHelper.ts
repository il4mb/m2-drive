import { Brackets, SelectQueryBuilder } from "typeorm";
import { QueryCondition, QueryOperator } from "@/server/database/types";
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
                    const fieldMath = pathMatch[1].match(/^\"(.*)\"\.(.*)$/);
                    if (!fieldMath?.[1] || !fieldMath?.[2]) throw new Error(`Invalid JSON path: ${field}`);
                    const pathParts = fieldMath[2].split(".");
                    const rootField = fieldMath[1];
                    const jsonPathSql = pathParts.map((p) => `'${p}'`).join("->>");
                    if (rootField.startsWith("$")) {
                        return `${rootField.replace(/^\$/, '')}->>${jsonPathSql}`;
                    }
                    return `${alias}.${rootField}->>${jsonPathSql}`;
                })()
                : field.startsWith("$")
                    ? `${String(field.replace(/^\$/, ''))}`
                    : `${alias}.${String(field)}`;

            const paramBase = `p_${idx}_${String(field).replace(/\W+/g, "_")}`;

            // Handle special operators that don't require values
            if (operator === "IS NULL" || operator === "IS NOT NULL") {
                const clause = `${qualified} ${operator}`;
                applyClause(qbInner, idx, logical, clause, {});
                return;
            }

            // Handle EXISTS and NOT EXISTS (typically used with subqueries)
            if (operator === "EXISTS" || operator === "NOT EXISTS") {
                if (typeof value !== "string") {
                    throw new Error(`${operator} requires a subquery string`);
                }
                const clause = `${operator} (${value})`;
                applyClause(qbInner, idx, logical, clause, {});
                return;
            }

            // Handle special value tokens
            if (value === "@IsNull" || value === "@NotNull") {
                const clause =
                    value === "@IsNull"
                        ? `${qualified} IS NULL`
                        : `${qualified} IS NOT NULL`;
                applyClause(qbInner, idx, logical, clause, {});
                return;
            }

            // Standard operators mapping
            const opMap: Record<string, string> = {
                "==": "=",
                "!=": "!=",
                ">": ">",
                ">=": ">=",
                "<": "<",
                "<=": "<=",
                "LIKE": "LIKE",
                "ILIKE": "ILIKE",
                "NOT LIKE": "NOT LIKE",
                "NOT ILIKE": "NOT ILIKE",
                "REGEXP": "~",
                "NOT REGEXP": "!~",
                "STARTS WITH": "LIKE",
                "ENDS WITH": "LIKE"
            };

            // Handle IN and NOT IN operators
            if (operator === "IN" || operator === "NOT IN") {
                const vals = Array.isArray(value) ? value : [value];
                const clause = `${qualified} ${operator} (:...${paramBase})`;
                applyClause(qbInner, idx, logical, clause, { [paramBase]: vals });
                return;
            }

            // Handle BETWEEN and NOT BETWEEN operators
            if (operator === "BETWEEN" || operator === "NOT BETWEEN") {
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error(`${operator} requires [min, max]`);
                }
                const [a, b] = value;
                const clause = `${qualified} ${operator} :${paramBase}_a AND :${paramBase}_b`;
                applyClause(qbInner, idx, logical, clause, {
                    [`${paramBase}_a`]: a,
                    [`${paramBase}_b`]: b
                });
                return;
            }

            // Handle CONTAINS and NOT CONTAINS (PostgreSQL array operators)
            if (operator === "CONTAINS" || operator === "NOT CONTAINS") {
                const arrayOperator = operator === "CONTAINS" ? "@>" : "!@>";
                const clause = `${qualified} ${arrayOperator} :${paramBase}`;
                applyClause(qbInner, idx, logical, clause, { [paramBase]: value });
                return;
            }

            // Handle STARTS WITH and ENDS WITH (special LIKE cases)
            if (operator === "STARTS WITH" || operator === "ENDS WITH") {
                let likeValue: string;
                if (typeof value !== "string") {
                    throw new Error(`${operator} requires a string value`);
                }
                if (operator === "STARTS WITH") {
                    likeValue = `${value}%`;
                } else {
                    likeValue = `%${value}`;
                }
                const clause = `${qualified} LIKE :${paramBase}`;
                applyClause(qbInner, idx, logical, clause, { [paramBase]: likeValue });
                return;
            }

            // Handle standard operators from the map
            if (opMap[operator]) {
                const clause = `${qualified} ${opMap[operator]} :${paramBase}`;
                applyClause(qbInner, idx, logical, clause, { [paramBase]: value });
                return;
            }

            throw new Error(`Unsupported operator: ${operator}`);
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