import { getConnection } from "@/data-source";
import { Activity } from "@/entities/Activity";
import { currentTime } from "@/libs/utils";

export default async function cleanActivityTask() {
    try {
        const connection = await getConnection();
        const activityRepository = connection.getRepository(Activity);
        const monthAgo = currentTime("-30d");
        await activityRepository
            .createQueryBuilder()
            .delete()
            .from(Activity)
            .where("type IN (:...types)", { types: ["CONNECT", "DISCONNECT"] })
            .orWhere("createdAt < :monthAgo", { monthAgo })
            .execute();
    } catch (error: any) {
        console.error(`❌ Failed to clean activities:`, error);
        throw error;
    }
}