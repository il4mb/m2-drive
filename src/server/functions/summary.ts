import { getConnection } from "@/data-source";
import { Activity } from "@/entities/Activity";
import { createFunction } from "../funcHelper";
import { UAParser } from "ua-parser-js";
import { DATE_EPOCH } from "@/libs/utils";

export type ActivitySummary = {
    total: number,
    perDay: { date: string, count: number }[],
    byType: { type: string, count: number }[],
    topUsers: { userId: string, name?: string, count: number }[],
    byUserAgent: { agent: string, count: number }[]
}

export const getActivitySummary = createFunction(async (): Promise<ActivitySummary> => {
    const repo = (await getConnection()).getRepository(Activity);
    const total = await repo.count();

    const perDay = await repo.createQueryBuilder("a")
        .select(`date(datetime(a.createdAt + ${DATE_EPOCH}, 'unixepoch'))`, "date")
        .addSelect("COUNT(*)", "count")
        .groupBy("date")
        .orderBy("date", "ASC")
        .getRawMany();

    const byType = await repo.createQueryBuilder("a")
        .select("a.type", "type")
        .addSelect("COUNT(*)", "count")
        .groupBy("a.type")
        .orderBy("count", "DESC")
        .getRawMany();

    const topUsers = await repo.createQueryBuilder("a")
        .select("a.userId", "userId")
        .addSelect("COUNT(*)", "count")
        .groupBy("a.userId")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany();

    // === UserAgent summary ===
    const userAgents = await repo.createQueryBuilder("a")
        .select("a.userAgent", "userAgent")
        .addSelect("COUNT(*)", "count")
        .where("a.userAgent IS NOT NULL")
        .groupBy("a.userAgent")
        .getRawMany<{ userAgent: string, count: number }>();

    // Normalize to browser family
    const byUserAgentMap: Record<string, number> = {};
    for (const ua of userAgents) {
        const parser = new UAParser(ua.userAgent);
        const browser = parser.getBrowser().name || "Unknown";
        byUserAgentMap[browser] = (byUserAgentMap[browser] || 0) + Number(ua.count);
    }

    const byUserAgent = Object.entries(byUserAgentMap)
        .map(([agent, count]) => ({ agent, count }))
        .sort((a, b) => b.count - a.count);

    const data = { total, perDay, byType, topUsers, byUserAgent }
    return data;
});
