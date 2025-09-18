import { bucketName, s3Client } from "@/libs/s3-storage";
import { TaskHandlerMap, TaskQueue } from "@/libs/TaskQueue";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createLogger } from "@/libs/logger";
import pdfConverTask from "./task-handler/pdfCoverter";
import scanStorageTask from "./task-handler/scanStorage";
import cleanStorageTask from "./task-handler/cleanStorage";
import cleanTask from "./task-handler/cleanTask";
import cleanActivityTask from "./task-handler/cleanActivity";
import cleanTrashTask from "./task-handler/cleanTrash";
import cleanOldBackupTask from "./task-handler/cleanOldBackup";
import backupDatabaseTask from "./task-handler/backupDatabase";
import generateThumbnailTask from "./task-handler/generateThumbnail";


const logger = createLogger("task-queue");
// Retry mechanism with exponential backoff
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            logger.warn(`Attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) break;

            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // @ts-ignore
    throw lastError;
};

export const handlers: TaskHandlerMap<TaskPayloads> = {
    "delete-file": async ({ objectKey }) => {
        try {
            logger.info(`Deleting file from S3: ${objectKey}`);

            await withRetry(async () => {
                await s3Client.send(
                    new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey })
                );
            });

            logger.info(`Successfully deleted file: ${objectKey}`);

        } catch (error) {
            logger.error(`Failed to delete file ${objectKey}:`, error);
            throw error;
        }
    },
    "generate-thumbnail": generateThumbnailTask,
    "convert-pdf": pdfConverTask,
    "backup-database": backupDatabaseTask,
    "delete-old-backup": cleanOldBackupTask,
    "clean-trash": cleanTrashTask,
    "clean-activities": cleanActivityTask,
    "scan-storage": scanStorageTask,
    "clean-storage": cleanStorageTask,
    "clean-task": cleanTask
};

export type TaskPayloads = {
    "delete-file": {
        objectKey: string;
    };
    "generate-thumbnail": {
        fileId: string;
        objectKey: string;
    };
    "convert-pdf": {
        fileId: string;
    };
    "backup-database": { objectKey: string };
    "delete-old-backup": {},
    "clean-trash": {},
    "clean-activities": {},
    "scan-storage": {},
    "clean-storage": {},
    "clean-task": {}
};

let started = false;
export const taskQueue = new TaskQueue({ concurrency: 3 });

type HandlerName = keyof typeof handlers;

export const addTaskQueue = <T extends HandlerName>(handler: T, payload: TaskPayloads[T], priority: number = 0) => {
    taskQueue.add(handler, payload, priority);
    logger.debug(`Task added to queue: ${String(handler)}`, payload);
};

export function startTaskQueue() {
    if (started) {
        logger.warn("Task queue already started");
        return;
    }

    started = true;
    taskQueue.start<TaskPayloads>(handlers);
    logger.info("📦 Task queue started with concurrency 3");
}

// Graceful shutdown
export async function stopTaskQueue() {
    if (!started) return;

    logger.info("🛑 Stopping task queue...");
    await taskQueue.stop();
    started = false;
    logger.info("✅ Task queue stopped");
}