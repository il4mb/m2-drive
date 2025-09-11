import { databasePath, getConnection } from "@/data-source";
import { requestContext } from "@/libs/requestContext";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { TaskHandlerMap, TaskQueue } from "@/libs/TaskQueue";
import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import { PassThrough } from "stream";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { File } from "@/entities/File";
import { currentTime } from "@/libs/utils";
import { createLogger } from "@/libs/logger";
import { imageSize } from "image-size";
import { EventEmitter } from "events";
import { readFileSync } from "fs";
import { Task } from "@/entities/Task";
import { In, JsonContains } from "typeorm";

const MAX_BACKUPS = 7;
// Create a logger for task queue
const logger = createLogger("task-queue");

// Event emitter for monitoring
export const taskQueueEvents = new EventEmitter();

async function runFfmpeg(args: string[], input: NodeJS.ReadableStream, output: PassThrough) {
    return new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", ["-y", ...args]);

        ffmpeg.on("error", reject);

        ffmpeg.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        input.pipe(ffmpeg.stdin);
        ffmpeg.stdout.pipe(output);
    });
}

// Retry mechanism with exponential backoff
const withRetry = async <T>(
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
            taskQueueEvents.emit('taskCompleted', 'delete-file', { objectKey });

        } catch (error) {
            logger.error(`Failed to delete file ${objectKey}:`, error);
            taskQueueEvents.emit('taskFailed', 'delete-file', { objectKey, error });
            throw error;
        }
    },
    "generate-thumbnail": async ({ fileId, objectKey }) => {

        try {

            await requestContext.run({ user: "system" }, async () => {
                logger.info(`Generating thumbnail for file: ${fileId}`);

                const connection = await getConnection();
                const fileRepository = connection.getRepository(File);

                const file = (await fileRepository.findOneByOrFail({ id: fileId })) as File<'file'>;

                const mime = file.meta?.mimeType || "";
                // Only allow image or video
                if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
                    throw new Error(`Unsupported file type for thumbnail: ${mime}`);
                }

                let thumbnailKey: string | null = null;

                if (mime.startsWith("image/")) {
                    thumbnailKey = `thumbnails/${fileId}.jpg`;

                    // Get image from S3 with retry
                    const { Body } = await withRetry(async () => {
                        return s3Client.send(
                            new GetObjectCommand({ Bucket: bucketName, Key: objectKey })
                        );
                    });

                    if (!Body) throw new Error("Image not found in S3");

                    // For images, we need to download the entire file first to check dimensions
                    const chunks: Buffer[] = [];
                    for await (const chunk of Body as NodeJS.ReadableStream) {
                        // @ts-ignore
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);

                    const dimensions = imageSize(buffer);
                    const { width = 0, height = 0 } = dimensions;

                    if (width > 200 || height > 200) {
                        // Resize to 200x200 max - create a new stream from the buffer
                        const inputStream = new PassThrough();
                        inputStream.end(buffer);

                        const outputStream = new PassThrough();

                        await runFfmpeg([
                            "-i", "pipe:0",
                            "-vf", "scale='min(200,iw)':'min(200,ih)':force_original_aspect_ratio=decrease",
                            "-f", "image2",
                            "pipe:1",
                        ], inputStream, outputStream);

                        // Collect the output
                        const outputChunks: Buffer[] = [];
                        for await (const chunk of outputStream) {
                            outputChunks.push(chunk);
                        }
                        const outputBuffer = Buffer.concat(outputChunks);

                        await withRetry(async () => {
                            await s3Client.send(
                                new PutObjectCommand({
                                    Bucket: bucketName,
                                    Key: thumbnailKey!,
                                    Body: outputBuffer,
                                    ContentType: "image/jpeg",
                                    ContentLength: outputBuffer.length,
                                    ACL: "public-read",
                                })
                            );
                        });
                    } else {
                        // Use original image if it's already small enough
                        thumbnailKey = objectKey;
                    }
                }

                if (mime.startsWith("video/")) {
                    thumbnailKey = `thumbnails/${fileId}.jpg`;

                    const { Body } = await withRetry(async () =>
                        s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: objectKey }))
                    );

                    if (!Body) throw new Error("Video not found in S3");

                    // For videos, we can stream directly
                    const outputStream = new PassThrough();

                    await runFfmpeg([
                        "-i", "pipe:0",
                        "-ss", "00:00:01.000",
                        "-vframes", "1",
                        "-vf", "scale='min(300,iw)':'min(300,ih)':force_original_aspect_ratio=decrease",
                        "-f", "image2",
                        "pipe:1"
                    ], Body as NodeJS.ReadableStream, outputStream);

                    const chunks: Buffer[] = [];
                    for await (const chunk of outputStream) {
                        chunks.push(chunk);
                    }
                    const outputBuffer = Buffer.concat(chunks);

                    await withRetry(async () =>
                        s3Client.send(new PutObjectCommand({
                            Bucket: bucketName,
                            Key: thumbnailKey!,
                            Body: outputBuffer,
                            ContentType: "image/jpeg",
                            ContentLength: outputBuffer.length,
                            ACL: "public-read",
                        }))
                    );
                }

                if (thumbnailKey) {
                    // Update DB with retry
                    await withRetry(async () => {
                        await fileRepository.update(fileId, {
                            meta: () => `json_set(meta, '$.thumbnail', '${thumbnailKey}')`,
                            updatedAt: currentTime(),
                        });
                    });
                }

                logger.info(`✅ Thumbnail ready for ${fileId}`);
                taskQueueEvents.emit('taskCompleted', 'generate-thumbnail', { fileId, objectKey });
            });

        } catch (error) {
            logger.error(`❌ Failed to generate thumbnail for ${fileId}:`, error);
            taskQueueEvents.emit('taskFailed', 'generate-thumbnail', { fileId, objectKey, error });
            throw error;
        }
    },
    "backup-database": async ({ objectKey }: { objectKey: string }) => {
        try {

            if (!objectKey.startsWith("backup/")) {
                throw new Error("Object Key must start with backup/");
            }
            const buffer = readFileSync(databasePath);

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: objectKey,
                    Body: buffer,
                    ContentType: "application/x-sqlite3",
                    ACL: "private",
                })
            );

            console.log("✅ Backup uploaded:", objectKey);
        } catch (error) {
            logger.error(`❌ Failed to backup database:`, error);
            taskQueueEvents.emit("taskFailed", "backup-database");
            throw error;
        }
    },
    "delete-old-backup": async () => {
        try {
            const listResp = await s3Client.send(
                new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: "backup/",
                })
            );

            const backups = (listResp.Contents || [])
                .sort(
                    (a, b) =>
                        (b.LastModified?.getTime() || 0) -
                        (a.LastModified?.getTime() || 0)
                );

            if (backups.length <= MAX_BACKUPS) {
                console.log("ℹ️ No old backups to delete.");
                return;
            }

            const oldBackups = backups.slice(MAX_BACKUPS);
            const keysToDelete = oldBackups.map((obj) => obj.Key!);

            await s3Client.send(
                new DeleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: keysToDelete.map((key) => ({ Key: key })),
                    },
                })
            );

            console.log("🗑️ Deleted old backups from S3:", keysToDelete);

            // --- Delete related Task records in DB
            const connection = await getConnection();
            const taskRepository = connection.getRepository(Task);

            // assuming Task.payload is JSON like { objectKey: "backup/xxx.sqlite" }
            await taskRepository.delete({
                payload: In(keysToDelete.map((k) => JSON.stringify({ objectKey: k }))),
            });

            console.log("🗑️ Deleted related Task rows:", keysToDelete.length);

        } catch (error) {
            logger.error(`❌ Failed to delete old backups:`, error);
            taskQueueEvents.emit("taskFailed", "delete-old-backup");
            throw error;
        }
    },
};

export type TaskPayloads = {
    "delete-file": {
        objectKey: string;
    };
    "generate-thumbnail": {
        fileId: string;
        objectKey: string;
    };
    "backup-database": { objectKey: string };
    "delete-old-backup": {}
};

let started = false;
export const taskQueue = new TaskQueue({ concurrency: 3 });

type HandlerName = keyof typeof handlers;

export const addTaskQueue = <T extends HandlerName>(handler: T, payload: TaskPayloads[T], priority: number = 0) => {
    taskQueue.add(handler, payload, priority);
    logger.debug(`Task added to queue: ${String(handler)}`, payload);
    taskQueueEvents.emit('taskAdded', handler, payload);
};

export function startTaskQueue() {
    if (started) {
        logger.warn("Task queue already started");
        return;
    }

    started = true;
    taskQueue.start<TaskPayloads>(handlers);

    // Add event listeners for monitoring
    taskQueue.on('taskStart', (handler, payload) => {
        logger.debug(`Task started: ${handler}`, payload);
        taskQueueEvents.emit('taskStart', handler, payload);
    });

    taskQueue.on('taskComplete', (handler, payload, duration) => {
        logger.debug(`Task completed in ${duration}ms: ${handler}`, payload);
        taskQueueEvents.emit('taskComplete', handler, payload, duration);
    });

    taskQueue.on('taskError', (handler, payload, error) => {
        logger.error(`Task failed: ${handler}`, { payload, error });
        taskQueueEvents.emit('taskError', handler, payload, error);
    });

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