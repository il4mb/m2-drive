import { databasePath, getConnection } from "@/data-source";
import { createFunction, writeActivity } from "../funcHelper";
import { statSync } from "fs";
import { addTaskQueue } from "@/server/taskQueue";
import { Task } from "@/entities/Task";
import { generateKey } from "@/libs/utils";
import { checkPermission } from "../checkPermission";

export type DatabaseInfo = {
    size: number;
    schema: TableSchema[];
    lastBackup: number | null | undefined;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primary: boolean;
    unique: boolean;
    foreignKey?: {
        table: string;
        column: string;
    };
    default?: string;
}

export interface TableSchema {
    tableName: string;
    columns: ColumnInfo[];
    rowCount?: number;
    size?: string;
}

export const getDatabaseInfo = createFunction(async (): Promise<DatabaseInfo> => {

    await checkPermission("can-see-db");
    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const stat = statSync(databasePath);

    const lastTask = await taskRepository.findOne({
        where: { type: "backup-database" },
        order: {
            completedAt: "DESC",
            createdAt: "DESC",
        },
    });


    const schema: TableSchema[] = [];

    for (const meta of connection.entityMetadatas) {
        const tableName = meta.tableName;

        // Map column metadata
        const columns: ColumnInfo[] = meta.columns.map((col) => {
            const foreignMeta = meta.foreignKeys.find((fk) =>
                fk.columns.some((c) => c.databaseName === col.databaseName)
            );

            // Check if column is part of a unique constraint
            const isUnique =
                meta.uniques.some((u) =>
                    u.columns.some((c) => c.databaseName === col.databaseName)
                ) ||
                meta.indices.some((idx) => idx.isUnique && idx.columns.some((c) => c.databaseName === col.databaseName));

            return {
                name: col.databaseName,
                type: col.type instanceof Function ? col.type.name : String(col.type),
                nullable: col.isNullable,
                primary: col.isPrimary,
                unique: isUnique,
                default: col.default ? String(col.default) : undefined,
                foreignKey: foreignMeta
                    ? {
                        table: foreignMeta.referencedEntityMetadata.tableName,
                        column: foreignMeta.referencedColumns[0]?.databaseName || "",
                    }
                    : undefined,
            };
        });


        // Row count (may be expensive for big tables!)
        let rowCount: number | undefined = undefined;
        try {
            const result = await connection.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
            rowCount = result[0]?.count ?? 0;
        } catch (e) {
            console.warn(`⚠️ Could not fetch row count for ${tableName}`, e);
        }

        schema.push({
            tableName,
            columns,
            rowCount,
        });
    }

    writeActivity("VIEW_DATABASE", `Melihat database`);

    return {
        size: stat.size,
        schema,
        lastBackup: lastTask?.createdAt || lastTask?.createdAt
    };
});

export const backupDatabase = createFunction(async () => {
    
    await checkPermission("can-manage-db");
    addTaskQueue("backup-database", { objectKey: `backup/${generateKey(12)}` }, 10);
    addTaskQueue("delete-old-backup", {});

    const now = new Date();
    const formatted = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(now);
    writeActivity("BACKUP_DATABASE", `Membackup database ${formatted}`);
});
