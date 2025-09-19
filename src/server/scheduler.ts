import cron from "node-cron";
import { addTaskQueue } from "./taskQueue";
import { getOption } from "./funcHelper";
import { addBackupTask } from "./task-handler/backupDatabase";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function setupScheduler() {
    cron.schedule("0 0 * * *", async () => {
        // run sequentially with 1s delay
        await addBackupTask();
        await sleep(5000);

        addTaskQueue("delete-old-backup", {});
        await sleep(5000);

        addTaskQueue("scan-storage", {});
        await sleep(5000);

        const autoCleanActivities = await getOption("auto-clean-activities");
        if (autoCleanActivities === "true") {
            addTaskQueue("clean-activities", {});
            await sleep(5000);
        }

        const autoCleanTask = await getOption("auto-clean-task");
        if (autoCleanTask === "true") {
            addTaskQueue("clean-task", {});
            await sleep(5000);
        }
    });

    console.log("📦 Scheduler started!");
}
