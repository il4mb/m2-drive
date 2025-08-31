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

export const entityMap = {
    file: File,
    user: User,
    contributor: Contributor,
    options: Options,
    role: Role,
    token: Token,
    "task-queue": TaskQueueItem,
} as const;

export type EntityMap = typeof entityMap;
export type EntityName = keyof EntityMap;

/** Special value tokens for null checks */
const SPECIAL_VALUES = {
    "@IsNull": "@IsNull",
    "@NotNull": "@NotNull",
} as const;

type SpecialValue = keyof typeof SPECIAL_VALUES;

function isSpecialValue(v: unknown): v is SpecialValue {
    return typeof v === "string" && (v === "@IsNull" || v === "@NotNull");
}

/** Operator mapping for FindOptionsWhere (repository.find/findOne) */
function mapOperatorToFind(value: any, operator: string) {
    switch (operator) {
        case "==":
            return value;
        case "!=":
            return Not(value);
        case ">":
            return MoreThan(value);
        case ">=":
            return MoreThanOrEqual(value);
        case "<":
            return LessThan(value);
        case "<=":
            return LessThanOrEqual(value);
        case "LIKE":
            return Like(value);
        case "ILIKE":
            return ILike(value);
        case "IN":
            return In(Array.isArray(value) ? value : [value]);
        case "BETWEEN":
            if (!Array.isArray(value) || value.length !== 2) {
                throw new Error("BETWEEN needs [min, max] array as value");
            }
            return Between(value[0], value[1]);
        default:
            return value;
    }
}

/** Build FindOptionsWhere with support for OR groups */
function buildWhereForFind(conditions: QueryCondition[] = []): FindOptionsWhere<any> | FindOptionsWhere<any>[] {
    if (!conditions.length) return {};

    const groups: FindOptionsWhere<any>[] = [];
    let current: FindOptionsWhere<any> = {};

    for (const cond of conditions) {
        const { field, operator, value } = cond;

        if (isSpecialValue(value)) {
            // Special values only support IS NULL / IS NOT NULL in QueryBuilder.
            // For FindOptionsWhere, map them via helpers when possible:
            if (value === "@IsNull") {
                current[field] = IsNull();
            } else if (value === "@NotNull") {
                current[field] = Not(IsNull());
            }
        } else {
            current[field] = mapOperatorToFind(value, operator);
        }

        if (cond.logical === "OR") {
            groups.push(current);
            current = {};
        }
    }

    groups.push(current);
    return groups.length > 1 ? groups : groups[0];
}

/** Apply conditions to a QueryBuilder with alias qualification and AND/OR logic */
function applyConditions(
    qb: SelectQueryBuilder<any>,
    alias: string,
    conditions: QueryCondition[] = []
) {
    conditions.forEach((cond, idx) => {
        const { field, operator, value, logical } = cond;
        let qualified: string;

        // Handle JSON path
        if (field.startsWith("@Json(")) {
            const pathMatch = field.match(/\@Json\((.*?)\)/);
            if (!pathMatch?.[1]) {
                throw new Error(`Invalid JSON path: ${field}`);
            }
            const pathParts = pathMatch[1].split(".");
            const rootField = pathParts.shift();
            const jsonPathSql = pathParts.map((p) => `'${p}'`).join("->>");
            qualified = `${alias}.${rootField}->>${jsonPathSql}`;
        } else {
            qualified = `${alias}.${String(field)}`;
        }

        // Special value handlers
        if (isSpecialValue(value)) {
            const clause =
                value === "@IsNull"
                    ? `${qualified} IS NULL`
                    : `${qualified} IS NOT NULL`;
            if (idx === 0) qb.where(clause);
            else if (logical === "OR") qb.orWhere(clause);
            else qb.andWhere(clause);
            return;
        }

        // Parameter base name
        const paramBase = `p_${idx}_${String(field).replace(/\W+/g, "_")}`;

        // Operator handling
        switch (operator) {
            case "IN": {
                const vals = Array.isArray(value) ? value : [value];
                const clause = `${qualified} IN (:...${paramBase})`;
                const params = { [paramBase]: vals };
                applyClause(qb, idx, logical, clause, params);
                break;
            }
            case "BETWEEN": {
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error("BETWEEN requires [min, max]");
                }
                const [a, b] = value;
                const clause = `${qualified} BETWEEN :${paramBase}_a AND :${paramBase}_b`;
                const params = { [`${paramBase}_a`]: a, [`${paramBase}_b`]: b };
                applyClause(qb, idx, logical, clause, params);
                break;
            }
            case "LIKE":
            case "ILIKE":
            case "==":
            case "!=":
            case ">":
            case ">=":
            case "<":
            case "<=": {
                const sqlMap: Record<string, string> = {
                    "==": "=",
                    "!=": "!=",
                    ">": ">",
                    ">=": ">=",
                    "<": "<",
                    "<=": "<=",
                    LIKE: "LIKE",
                    ILIKE: "ILIKE",
                };
                const op = sqlMap[operator] ?? "=";
                const clause = `${qualified} ${op} :${paramBase}`;
                const params = { [paramBase]: value };
                applyClause(qb, idx, logical, clause, params);
                break;
            }
            default: {
                const clause = `${qualified} = :${paramBase}`;
                const params = { [paramBase]: value };
                applyClause(qb, idx, logical, clause, params);
            }
        }
    });
}

// Helper to apply clause with correct where/orWhere/andWhere
function applyClause(
    qb: SelectQueryBuilder<any>,
    idx: number,
    logical: "AND" | "OR" | undefined,
    clause: string,
    params?: Record<string, any>
) {
    if (idx === 0) qb.where(clause, params);
    else if (logical === "OR") qb.orWhere(clause, params);
    else qb.andWhere(clause, params);
}


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

            // ORDER
            if (config.orderBy) {
                qb.orderBy(`${alias}.${String(config.orderBy.field)}`, config.orderBy.direction);
            }

            // PAGINATION
            if (config.offset) qb.offset(config.offset);
            if (config.limit) qb.limit(config.limit);

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

    /** Create a new document */
    async createDocument<T>(collection: EntityName, data: Partial<T>): Promise<T> {
        try {
            const repo = await this.getRepository(collection);
            const entity = repo.create(data as any);
            return (await repo.save(entity)) as T;
        } catch (err: any) {
            console.error("Create document error:", err);
            throw new Error(`Failed to create document: ${err.message}`);
        }
    }

    /** Get a single document by primary id */
    async getDocument<T>(collection: EntityName, id: string | number): Promise<T | null> {
        try {
            const repo = await this.getRepository(collection);
            const result = await repo.findOne({ where: { id } as any });
            return (result as T) ?? null;
        } catch (err: any) {
            console.error("Get document error:", err);
            throw new Error(`Failed to get document: ${err.message}`);
        }
    }

    /** Get a single document by conditions (uses FindOptionsWhere with OR grouping) */
    async getDocumentByConditions<T>(collection: EntityName, conditions: QueryCondition[]): Promise<T | null> {
        try {
            const repo = await this.getRepository(collection);
            const where = buildWhereForFind(conditions);
            const result = await repo.findOne({ where });
            return (result as T) ?? null;
        } catch (err: any) {
            console.error("Get document by conditions error:", err);
            throw new Error(`Failed to get document: ${err.message}`);
        }
    }

    /** Update a document by primary id */
    async updateDocument<T>(collection: EntityName, id: string | number, data: Partial<T>): Promise<T> {
        try {
            const repo = await this.getRepository(collection);
            const existing = await repo.findOne({ where: { id } as any });
            if (!existing) throw new Error(`Document with ID ${id} not found`);
            const merged = repo.merge(existing, data as any);
            return (await repo.save(merged)) as T;
        } catch (err: any) {
            console.error("Update document error:", err);
            throw new Error(`Failed to update document: ${err.message}`);
        }
    }

    /** Delete a document by primary id */
    async deleteDocument(collection: EntityName, id: string | number): Promise<boolean> {
        try {
            const repo = await this.getRepository(collection);
            const result = await repo.delete(id);
            return (result.affected || 0) > 0;
        } catch (err: any) {
            console.error("Delete document error:", err);
            throw new Error(`Failed to delete document: ${err.message}`);
        }
    }

    /** Count documents matching conditions (FindOptionsWhere with OR groups) */
    async countDocuments(collection: EntityName, conditions: QueryCondition[] = []): Promise<number> {
        try {
            const repo = await this.getRepository(collection);
            const where = buildWhereForFind(conditions);
            return await repo.count({ where });
        } catch (err: any) {
            console.error("Count documents error:", err);
            throw new Error(`Failed to count documents: ${err.message}`);
        }
    }

    /** Execute raw SQL */
    async executeRawQuery<T>(sql: string, parameters: any[] = []): Promise<T[]> {
        try {
            const connection = await getConnection();
            return await connection.query(sql, parameters);
        } catch (err: any) {
            console.error("Raw query error:", err);
            throw new Error(`Raw query failed: ${err.message}`);
        }
    }

    /** Check existence by conditions */
    async documentExists(collection: EntityName, conditions: QueryCondition[]): Promise<boolean> {
        return (await this.countDocuments(collection, conditions)) > 0;
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
export const createDocument = databaseService.createDocument.bind(databaseService);
export const getDocument = databaseService.getDocument.bind(databaseService);
export const updateDocument = databaseService.updateDocument.bind(databaseService);
export const deleteDocument = databaseService.deleteDocument.bind(databaseService);
export const countDocuments = databaseService.countDocuments.bind(databaseService);
export const getDocumentByConditions = databaseService.getDocumentByConditions.bind(databaseService);
export const documentExists = databaseService.documentExists.bind(databaseService);
export const executeRawQuery = databaseService.executeRawQuery.bind(databaseService);
