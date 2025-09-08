'use server'

import { getRequestContext } from "@/libs/requestContext";
import { createFunction } from "../funcHelper"
import { File } from "@/entity/File";
import { getConnection } from "@/data-source";

export type UserDriveSummary = {
    userId: string,
    userName: string,
    userEmail: string,
    userAvatar: string,
    fileCount: number,
    folderCount: number,
    totalSize: number,
    mimeBreakdown: Record<string, number>
}

type UssageSummaryProps = {
    userId?: string;
    all?: boolean;
}

export const getUserUssageSummary = createFunction(async ({ userId }: UssageSummaryProps) => {

    const { user } = getRequestContext();

    const connection = await getConnection();
    const fileRepository = connection.getRepository(File);

    const [summary] = await fileRepository.query(`
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
    `, [userId]);

    if (!summary) throw new Error("User not found");

    // MIME type breakdown
    const mimeTypeRows = await fileRepository.query(`
        SELECT f.meta->>'mimeType' AS mimeType, COUNT(*) AS count
        FROM "files" f
        WHERE f."uId" = $1
          AND f.type = 'file'
        GROUP BY f.meta->>'mimeType'
    `, [userId]);

    const mimeArray: ({ count: number, mimeType: string })[] = mimeTypeRows.map((row: any) => ({
        mimeType: row.mimeType || 'unknown',
        count: Number(row.count)
    }));

    mimeArray.sort((a, b) => b.count - a.count);

    const top5 = mimeArray.slice(0, 5);
    const othersTotal = mimeArray.slice(5).reduce((sum, r) => sum + r.count, 0);
    if (othersTotal > 0) top5.push({ mimeType: 'Others', count: othersTotal });

    const mimeTypeCount: Record<string, number> = {};
    for (const item of top5) mimeTypeCount[item.mimeType] = item.count;

    return {
        ...summary,
        mimeBreakdown: mimeTypeCount
    } as UserDriveSummary

})