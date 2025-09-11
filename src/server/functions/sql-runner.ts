interface QueryResult {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTime: number;
    success: boolean;
    error?: string;
}

import { getConnection } from "@/data-source";
import { createFunction, writeActivity } from "../funcHelper";
import { checkPermission } from "../checkPermission";

const blockedKeywords = ["create", "drop", "alter", "truncate", "delete"];

export const executeSQL = createFunction(async ({ sql }: { sql: string }): Promise<QueryResult> => {
   
    await checkPermission("can-manage-db");
    
    const normalized = sql.trim().toLowerCase();

    // Block if starts with disallowed keyword
    if (blockedKeywords.some(kw => normalized.includes(kw))) {
        throw new Error(`Failed Execute SQL: Cannot execute dangerous query [${sql}]`);
    }

    const connection = await getConnection();
    const start = Date.now();

     writeActivity("RUN_QUERY", `Menjalankan query SQL database`);

    try {
        const rows = await connection.query(sql);
        const executionTime = Date.now() - start;

        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        return {
            columns,
            rows,
            rowCount: rows.length,
            executionTime,
            success: true,
        };
    } catch (err: any) {
        const executionTime = Date.now() - start;
        return {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime,
            success: false,
            error: err.message,
        };
    }
});