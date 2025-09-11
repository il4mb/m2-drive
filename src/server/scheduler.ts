// lib/scheduler.ts
import cron from "node-cron";
import { addTaskQueue } from "./taskQueue";
import { generateKey } from "@/libs/utils";

export function setupScheduler() {
    cron.schedule("0 0 * * *", () => {
        addTaskQueue("backup-database", { objectKey: `backup/${generateKey(12)}` }, 10);
        addTaskQueue("delete-old-backup", {});
    });

    console.log("📦 Scheduler started!")
}
