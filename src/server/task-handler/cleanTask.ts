import { getConnection } from "@/data-source";
import { Task } from "@/entities/Task";
import { currentTime } from "@/libs/utils";

export default async function cleanTask() {
    try {
        const connection = await getConnection();
        const activityRepository = connection.getRepository(Task);
        const monthAgo = currentTime("-30d");
        await activityRepository
            .createQueryBuilder()
            .delete()
            .from(Task)
            .where("createdAt < :monthAgo", { monthAgo })
            .execute();

    } catch (error: any) {
        console.error(`❌ Failed to clean task:`, error);
        throw error;
    }
}