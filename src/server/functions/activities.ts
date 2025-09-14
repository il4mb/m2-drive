import { getConnection } from "@/data-source";
import { createFunction, writeActivity } from "../funcHelper";
import { Activity } from "@/entities/Activity";
import { currentTime } from "@/libs/utils";
import { checkPermission } from "../checkPermission";

export const cleanNonEssentialActivities = createFunction(async () => {

    await checkPermission("can-manage-activity-report");
    const connection = await getConnection();
    const activityRepository = connection.getRepository(Activity);

    const monthAgo = currentTime("-30d");

    const result = await activityRepository
        .createQueryBuilder()
        .delete()
        .from(Activity)
        .where("type IN (:...types)", { types: ["CONNECT", "DISCONNECT"] })
        .orWhere("createdAt < :monthAgo", { monthAgo })
        .execute();


    writeActivity(
        "CLEAN_ACTIVITY",
        "Membersihkan aktivitas yang tidak penting",
        { affected: result.affected || 0 }
    );

    return {
        deleted: result.affected || 0,
    };
});
