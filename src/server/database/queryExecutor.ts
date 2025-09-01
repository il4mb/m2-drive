// server/database/index.ts
import {
    Repository,
    FindOptionsWhere,
    IsNull,
    Not,
    In,
    Like,
    MoreThan,
    LessThan,
    MoreThanOrEqual,
    LessThanOrEqual,
    Between,
    ILike,
    DataSource,
    SelectQueryBuilder,
} from "typeorm";
import { getConnection } from "@/data-source";

import { File } from "@/entity/File";
import User from "@/entity/User";
import Contributor from "@/entity/Contributor";
import { Options } from "@/entity/Options";
import Role from "@/entity/Role";
import Token from "@/entity/Token";
import { TaskQueueItem } from "@/entity/TaskQueueItem";

import { QueryConfig, QueryCondition, QueryType } from "./types";
import { entityMap, EntityName } from ".";
import { applyConditions } from "./queryHelper";


// /** Special value tokens for null checks */
// const SPECIAL_VALUES = {
//     "@IsNull": "@IsNull",
//     "@NotNull": "@NotNull",
// } as const;

// type SpecialValue = keyof typeof SPECIAL_VALUES;

// function isSpecialValue(v: unknown): v is SpecialValue {
//     return typeof v === "string" && (v === "@IsNull" || v === "@NotNull");
// }

// /** Apply conditions to a QueryBuilder with alias qualification and AND/OR logic */
// function applyConditions(
//     qb: SelectQueryBuilder<any>,
//     alias: string,
//     conditions: QueryCondition[] = []
// ) {
//     conditions.forEach((cond, idx) => {
//         const { field, operator, value, logical } = cond;
//         let qualified: string;

//         // Handle JSON path
//         if (field.startsWith("@Json(")) {
//             const pathMatch = field.match(/\@Json\((.*?)\)/);
//             if (!pathMatch?.[1]) {
//                 throw new Error(`Invalid JSON path: ${field}`);
//             }
//             const pathParts = pathMatch[1].split(".");
//             const rootField = pathParts.shift();
//             const jsonPathSql = pathParts.map((p) => `'${p}'`).join("->>");
//             qualified = `${alias}.${rootField}->>${jsonPathSql}`;
//         } else {
//             qualified = `${alias}.${String(field)}`;
//         }

//         // Special value handlers
//         if (isSpecialValue(value)) {
//             const clause =
//                 value === "@IsNull"
//                     ? `${qualified} IS NULL`
//                     : `${qualified} IS NOT NULL`;
//             if (idx === 0) qb.where(clause);
//             else if (logical === "OR") qb.orWhere(clause);
//             else qb.andWhere(clause);
//             return;
//         }

//         // Parameter base name
//         const paramBase = `p_${idx}_${String(field).replace(/\W+/g, "_")}`;

//         // Operator handling
//         switch (operator) {
//             case "IN": {
//                 const vals = Array.isArray(value) ? value : [value];
//                 const clause = `${qualified} IN (:...${paramBase})`;
//                 const params = { [paramBase]: vals };
//                 applyClause(qb, idx, logical, clause, params);
//                 break;
//             }
//             case "BETWEEN": {
//                 if (!Array.isArray(value) || value.length !== 2) {
//                     throw new Error("BETWEEN requires [min, max]");
//                 }
//                 const [a, b] = value;
//                 const clause = `${qualified} BETWEEN :${paramBase}_a AND :${paramBase}_b`;
//                 const params = { [`${paramBase}_a`]: a, [`${paramBase}_b`]: b };
//                 applyClause(qb, idx, logical, clause, params);
//                 break;
//             }
//             case "LIKE":
//             case "ILIKE":
//             case "==":
//             case "!=":
//             case ">":
//             case ">=":
//             case "<":
//             case "<=": {
//                 const sqlMap: Record<string, string> = {
//                     "==": "=",
//                     "!=": "!=",
//                     ">": ">",
//                     ">=": ">=",
//                     "<": "<",
//                     "<=": "<=",
//                     LIKE: "LIKE",
//                     ILIKE: "ILIKE",
//                 };
//                 const op = sqlMap[operator] ?? "=";
//                 const clause = `${qualified} ${op} :${paramBase}`;
//                 const params = { [paramBase]: value };
//                 applyClause(qb, idx, logical, clause, params);
//                 break;
//             }
//             default: {
//                 const clause = `${qualified} = :${paramBase}`;
//                 const params = { [paramBase]: value };
//                 applyClause(qb, idx, logical, clause, params);
//             }
//         }
//     });
// }

// // Helper to apply clause with correct where/orWhere/andWhere
// function applyClause(
//     qb: SelectQueryBuilder<any>,
//     idx: number,
//     logical: "AND" | "OR" | undefined,
//     clause: string,
//     params?: Record<string, any>
// ) {
//     if (idx === 0) qb.where(clause, params);
//     else if (logical === "OR") qb.orWhere(clause, params);
//     else qb.andWhere(clause, params);
// }


export class DatabaseService {
    /** Execute query for "get" (single) or "list" (many) */
    async executeQuery<T>(config: QueryConfig): Promise<T | T[]> {
        try {
            const repository = await this.getRepository(config.collection);
            const alias = config.collection;

            // Use QueryBuilder for both modes to keep logic consistent
            const qb = repository.createQueryBuilder(alias);

            // WHERE
            applyConditions(qb, alias, config.conditions || []);

            if (config.relations?.length) {
                config.relations.forEach(rel => {
                    qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
                });
            }



            // ORDER
            if (config.orderBy) {
                qb.orderBy(`${alias}.${String(config.orderBy.field)}`, config.orderBy.direction);
            }


            // PAGINATION
            if (config.offset) qb.offset(config.offset);
            if (config.limit) qb.limit(config.limit);

            console.log(qb.getQueryAndParameters())

            if (config.type === "one") {
                // Ensure only one row
                if (!config.limit) qb.limit(1);
                const row = JSON.parse(JSON.stringify(await qb.getOne()));
                return row as T;
            }

            if (config.type === "list") {
                const rows = JSON.parse(JSON.stringify(await qb.getMany()));
                return rows as T[];
            }

            throw new Error(`Unsupported query type: ${config.type}`);
        } catch (err: any) {
            console.error("Query execution error:", err);
            throw new Error(`Database query failed: ${err.message}`);
        }
    }

    /** Get repository for a collection */
    private async getRepository(collection: EntityName): Promise<Repository<any>> {
        const connection: DataSource = await getConnection();
        const entity = entityMap[collection];
        if (!entity) throw new Error(`No entity mapping found for collection: ${collection}`);
        return connection.getRepository(entity);
    }
}

const databaseService = new DatabaseService();

// Bound helpers
export const executeQuery = databaseService.executeQuery.bind(databaseService);