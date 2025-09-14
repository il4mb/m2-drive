// lib/scheduler.ts
import cron from "node-cron";
import { addTaskQueue } from "./taskQueue";
import { generateKey } from "@/libs/utils";
import { getOption } from "./funcHelper";

export function setupScheduler() {
    cron.schedule("0 0 * * *", async () => {
        addTaskQueue("backup-database", { objectKey: `backup/${generateKey(12)}` }, 10);
        addTaskQueue("delete-old-backup", {});
        addTaskQueue("scan-storage", {});

        const autoCleanActivities = await getOption("auto-clean-activities");
        if (autoCleanActivities == "true") {
            addTaskQueue("clean-activities", {});
        }
        const autoCleanTask = await getOption("auto-clean-task");
        if (autoCleanTask == "true") {
            addTaskQueue("clean-task", {});
        }
    });

    console.log("📦 Scheduler started!")
}
