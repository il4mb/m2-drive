import { Repository, DataSource } from "typeorm";
import { getConnection } from "@/data-source";
import { QueryConfig } from "./types";
import { entityMap, EntityName } from ".";
import { applyConditions } from "./queryHelper";


export class DatabaseService {
    /** Execute query for "get" (single) or "list" (many) */
    async executeQuery<T>(config: QueryConfig): Promise<T | { rows: T[]; total: number; }> {

        try {

            const repository = await this.getRepository(config.collection);
            const alias = config.collection;

            // Use QueryBuilder for both modes to keep logic consistent
            const qb = repository.createQueryBuilder(alias);

            if (config.relations?.length) {
                config.relations.forEach(rel => {
                    qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
                });
            }

            if (config.joins?.length) {
                const joinPromise = config.joins.map(async (join) => {
                    const tableName = (await this.getRepository(join.entity)).metadata.tableName;
                    qb.leftJoinAndMapOne(
                        `${alias}.${join.alias || join.entity}`,
                        `${tableName}`,
                        join.alias || join.entity,
                        join.on
                    );
                });
                await Promise.all(joinPromise);
            }

            // WHERE
            applyConditions(qb, alias, config.conditions || []);

            // GROUP
            if (config.group && config.group.length > 0) {
                config.group.map(field => {
                    qb.groupBy(
                        field.startsWith("$")
                            ? `${String(field.replace(/^\$/, ''))}`
                            : `${alias}.${String(field)}`
                    )
                })
            }

            // ORDER
            if (config.orderBy) {
                const field = `${config.orderBy.field}`;
                qb.orderBy(
                    field.startsWith("$")
                        ? `${String(field.replace(/^\$/, ''))}`
                        : `${alias}.${String(field)}`,
                    config.orderBy.direction || "DESC"
                )
            }

            // PAGINATION
            if (config.offset) qb.offset(config.offset);
            if (config.limit) qb.limit(config.limit);

            if (config.debug) {
                console.log(qb.getQueryAndParameters())
            }

            if (config.type == "count") {
                const row = await qb.getCount();
                if (config.debug) {
                    console.log("RESULT COUNT", row);
                }
                return row as T;
            }

            if (config.type === "one") {
                // Ensure only one row
                if (!config.limit) qb.limit(1);
                const row = JSON.parse(JSON.stringify(await qb.getOne()));
                if (config.debug) {
                    console.log("RESULT ONE", row);
                }
                return row as T;
            }

            if (config.type === "list") {
                const [rows, total] = await qb.getManyAndCount();

                if (config.debug) {
                    console.log("RESULT LIST", rows);
                }
                return {
                    rows: rows as T[],
                    total
                }
            }

            throw new Error(`Unsupported query type: ${config.type}`);
        } catch (err: any) {
            console.error("Query execution error:", err);
            throw new Error(`Database query failed: ${err.message}`);
        }
    }

    // async executeAndCount<T>(config: QueryConfig): Promise<{ rows: T[], total: number }> {

    //     try {

    //         const repository = await this.getRepository(config.collection);
    //         const alias = config.collection;

    //         // Use QueryBuilder for both modes to keep logic consistent
    //         const qb = repository.createQueryBuilder(alias);

    //         if (config.relations?.length) {
    //             config.relations.forEach(rel => {
    //                 qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
    //             });
    //         }

    //         // WHERE
    //         applyConditions(qb, alias, config.conditions || []);

    //         // GROUP
    //         if (config.group && config.group.length > 0) {
    //             config.group.map(field => {
    //                 qb.groupBy(
    //                     field.startsWith("$")
    //                         ? `${String(field.replace(/^\$/, ''))}`
    //                         : `${alias}.${String(field)}`
    //                 )
    //             })
    //         }

    //         // ORDER
    //         if (config.orderBy) {
    //             const field = `${config.orderBy.field}`;
    //             qb.orderBy(
    //                 field.startsWith("$")
    //                     ? `${String(field.replace(/^\$/, ''))}`
    //                     : `${alias}.${String(field)}`,
    //                 config.orderBy.direction || "DESC"
    //             )
    //         }

    //         // PAGINATION
    //         if (config.offset) qb.offset(config.offset);
    //         if (config.limit) qb.limit(config.limit);

    //         if (config.debug) {
    //             console.log(qb.getQueryAndParameters())
    //         }

    //         const [rows, total] = await qb.getManyAndCount()
    //         if (config.debug) {
    //             console.log("RESULT LIST", rows);
    //         }
    //         return {
    //             rows: rows as T[],
    //             total
    //         }

    //     } catch (err: any) {
    //         console.error("Query execution error:", err);
    //         throw new Error(`Database query failed: ${err.message}`);
    //     }
    // }

    /** Get repository for a collection */
    private async getRepository(collection: EntityName): Promise<Repository<any>> {
        const connection: DataSource = await getConnection();
        const entities = entityMap[collection];
        if (!entities) throw new Error(`No entities mapping found for collection: ${collection}`);
        return connection.getRepository(entities);
    }
}

const databaseService = new DatabaseService();

// Bound helpers
export const executeQuery = databaseService.executeQuery.bind(databaseService);