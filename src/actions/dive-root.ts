'use server'

import { getConnection } from "@/data-source"
import { withAction } from "@/libs/withApi"
import { File, Folder } from "@/entities/File"
import { IsNull } from "typeorm"
import { currentTime, generateKey } from "@/libs/utils"
import { getCurrentToken, getUserByToken } from "./current-session"
import { addTaskQueue } from "@/server/taskQueue"

export type UserDriveSummary = {
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string;
    fileCount: number;
    folderCount: number;
    totalSize: number;
}

export const getDriveRoot = withAction<{}, { summaries: UserDriveSummary[] }>(async () => {
    const source = await getConnection();

    const summaries = await source.query(`
        SELECT 
            COALESCE(u.id, f."uId", 'unknown') AS "userId",
            COALESCE(u.name, 'Unknown User') AS "userName",
            COALESCE(u.email, '') AS "userEmail",
            COALESCE(u.meta->>'avatar', '') AS "userAvatar",
            COUNT(*) FILTER (WHERE f.type = 'file') AS "fileCount",
            COUNT(*) FILTER (WHERE f.type = 'folder') AS "folderCount",
            COALESCE(SUM((f.meta->>'size')), 0) AS "totalSize"
        FROM "users" u
        FULL OUTER JOIN "files" f
            ON u.id = f."uId"
        GROUP BY COALESCE(u.id, f."uId"), u.name, u.email, u.meta
        ORDER BY "userName";
    `);

    return {
        status: true,
        message: "Summary per user including unknown users",
        data: { summaries }
    };
});


export const getUserDriveSummary = withAction<{ uId: string }, UserDriveSummary & { mimeBreakdown: Record<string, number> }>(async ({ uId }) => {

    const source = await getConnection();

    // Main summary query
    const [summary] = await source.query(`
        SELECT 
            COALESCE(u.id, f."uId", 'unknown') AS "userId",
            COALESCE(u.name, 'Unknown User') AS "userName",
            COALESCE(u.email, '') AS "userEmail",
            COALESCE(u.meta->>'avatar', '') AS "userAvatar",
            COUNT(*) FILTER (WHERE f.type = 'file') AS "fileCount",
            COUNT(*) FILTER (WHERE f.type = 'folder') AS "folderCount",
            COALESCE(SUM(f.meta->>'size'), 0) AS "totalSize"
        FROM "users" u
        FULL OUTER JOIN "files" f
            ON u.id = f."uId"
        WHERE COALESCE(u.id, f."uId") = $1
        GROUP BY COALESCE(u.id, f."uId"), u.name, u.email, u.meta
    `, [uId]);

    if (!summary) throw new Error("User not found");

    // MIME type breakdown
    const mimeTypeRows = await source.query(`
        SELECT f.meta->>'mimeType' AS mimeType, COUNT(*) AS count
        FROM "files" f
        WHERE f."uId" = $1
          AND f.type = 'file'
        GROUP BY f.meta->>'mimeType'
    `, [uId]);

    const mimeArray: ({ count: number, mimeType: string })[] = mimeTypeRows.map((row: any) => ({
        mimeType: row.mimeType || 'unknown',
        count: Number(row.count)
    }));

    mimeArray.sort((a, b) => b.count - a.count);

    const top3 = mimeArray.slice(0, 4);
    const othersTotal = mimeArray.slice(4).reduce((sum, r) => sum + r.count, 0);
    if (othersTotal > 0) top3.push({ mimeType: 'Others', count: othersTotal });

    const mimeTypeCount: Record<string, number> = {};
    for (const item of top3) mimeTypeCount[item.mimeType] = item.count;

    return {
        status: true,
        message: "User drive summary",
        data: {
            ...summary,
            mimeBreakdown: mimeTypeCount
        }
    };
});
