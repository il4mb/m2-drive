import { databasePath, getConnection } from "@/data-source";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { TaskHandlerMap, TaskQueue } from "@/libs/TaskQueue";
import { AbortMultipartUploadCommand, DeleteObjectCommand, DeleteObjectsCommand, ListMultipartUploadsCommand, ListObjectsV2Command, ListObjectVersionsCommand } from "@aws-sdk/client-s3";
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
import { In } from "typeorm";
import { writeActivity } from "./funcHelper";
import User from "@/entities/User";
import Storage from "@/entities/Storage";
import { Activity } from "@/entities/Activity";

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
    "clean-trash": async () => {
        try {

            const connection = await getConnection();
            const fileRepository = connection.getRepository(File);

            const monthAgo = currentTime('-30d');
            const trashedFiles = await fileRepository.createQueryBuilder()
                .where("meta->>'trashed' = true")
                .where("meta->>'trashedAt' < :monthAgo", { monthAgo })
                .getMany();

            // If they have S3 keys, queue them for deletion
            for (const f of trashedFiles) {
                // @ts-ignore
                if (f.meta?.Key) {
                    // @ts-ignore
                    addTaskQueue("delete-file", { objectKey: f.meta.Key });
                }
            }

            await fileRepository.delete(trashedFiles.map(f => f.id));

        } catch (error) {
            logger.error(`❌ Failed to clean trash:`, error);
            taskQueueEvents.emit("taskFailed", "clean-trash");
            throw error;
        }
    },
    "clean-activities": async () => {

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
            logger.error(`❌ Failed to clean activities:`, error);
            taskQueueEvents.emit("taskFailed", "clean-activities");
            throw error;
        }

    },
    "scan-storage": async () => {

        try {

            const connection = await getConnection();
            const fileRepo = connection.getRepository(File);
            const userRepo = connection.getRepository(User);

            const usersId = (await userRepo
                .createQueryBuilder("u")
                .select("u.id", "id")
                .getRawMany<{ id: string }>())
                .map(u => u.id);

            const filesKey = (await fileRepo
                .createQueryBuilder("f")
                .select(`json_extract(f.meta, '$.Key')`, "Key")
                .where(`json_extract(f.meta, '$.Key') IS NOT NULL`)
                .getRawMany<{ Key: string }>())
                .map(f => f.Key?.replace(/^["']|["']$/g, ""));


            const thumbnailsKey = (await fileRepo
                .createQueryBuilder("f")
                .leftJoin(User, "u", "u.id = f.uId")
                .select(`json_extract(f.meta, '$.thumbnail')`, "thumbnail")
                .where(`json_extract(f.meta, '$.thumbnail') IS NOT NULL`)
                .andWhere("u.id IS NOT NULL")
                .getRawMany<{ thumbnail: string }>())
                .map(f => f.thumbnail);

            const usersIdSet = new Set(usersId);
            const filesKeySet = new Set(filesKey);
            const thumbnailKeySet = new Set(thumbnailsKey);

            const garbage: { key: string; size: number }[] = [];

            let continuationToken: string | undefined;
            let totalSize = 0;
            const objects: { key: string; size: number }[] = [];

            // 1. Committed objects
            do {

                const response = await s3Client.send(
                    new ListObjectsV2Command({
                        Bucket: bucketName,
                        ContinuationToken: continuationToken,
                    })
                );

                if (response.Contents) {
                    for (const obj of response.Contents) {
                        const key = obj.Key!;
                        const size = obj.Size ?? 0;

                        objects.push({ key, size });
                        totalSize += obj.Size ?? 0;

                        if (key.startsWith("backup/")) {
                            continue;
                        }

                        let exists = false;
                        if (key.startsWith("avatars/")) {
                            exists = usersIdSet.has(key.replace("avatars/", ""));
                        } else if (key.startsWith("thumbnails/")) {
                            exists = thumbnailKeySet.has(key.trim());
                        } else {
                            exists = filesKeySet.has(key.trim());
                        }

                        if (!exists)
                            console.log(key, filesKeySet.has(key.trim()))

                        if (!exists) {
                            garbage.push({ key, size });
                        }
                    }
                }

                continuationToken = response.NextContinuationToken;
            } while (continuationToken);

            // 2. Incomplete multipart uploads
            const multipart = await s3Client.send(
                new ListMultipartUploadsCommand({ Bucket: bucketName })
            );

            const multipartKeys = multipart.Uploads?.map(u => ({
                key: u.Key!,
                initiated: u.Initiated
            })) ?? [];

            // ⚠️ Sayangnya AWS SDK ga ngasih langsung "size" dari incomplete parts.
            // Kalau mau tau size, harus ListParts per UploadId.
            // Kalau cuma mau tau *ada sisa chunk* → bisa cukup count Uploads.

            // 3. Object versions (if versioning enabled)
            let versionToken: string | undefined;
            let versionedSize = 0;
            const versions: { key: string; size: number }[] = [];

            do {

                const resp = await s3Client.send(
                    new ListObjectVersionsCommand({
                        Bucket: bucketName,
                        KeyMarker: versionToken,
                    })
                );

                if (resp.Versions) {
                    for (const v of resp.Versions) {
                        versions.push({ key: v.Key!, size: v.Size ?? 0 });
                        versionedSize += v.Size ?? 0;
                    }
                }

                versionToken = resp.NextKeyMarker;

            } while (versionToken);

            const storageRepository = connection.getRepository(Storage);
            const data = storageRepository.create({
                committed: {
                    count: objects.length,
                    size: totalSize,
                },
                multipart: {
                    count: multipartKeys.length,
                    uploads: multipartKeys.map(e => ({
                        ...e,
                        initiated: e.initiated?.toISOString()
                    })),
                },
                versions: {
                    count: versions.length,
                    size: versionedSize,
                },
                size: totalSize + versionedSize,
                garbageItems: garbage,
                createdAt: currentTime()
            });

            await storageRepository.save(data);

        } catch (error: any) {
            logger.error(`❌ Failed to scan storage:`, error);
            taskQueueEvents.emit("taskFailed", "scan-storage");
            throw error;
        }
    },
    "clean-storage": async () => {
        try {

            const connection = await getConnection();
            const storageRepository = connection.getRepository(Storage);

            // ambil summary terakhir
            const latest = await storageRepository
                .createQueryBuilder("q")
                .orderBy("createdAt", "DESC")
                .limit(1)
                .getOne();

            if (!latest) throw new Error("❌ There is no newest storage record!");

            // 1. hapus semua garbageItem
            if (latest.garbageItems?.length) {
                for (const item of latest.garbageItems) {
                    addTaskQueue("delete-file", { objectKey: item.key });
                }
            }

            // 2. cleanup multipart uploads yang stuck >= 7 hari
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            let keyMarker: string | undefined;
            let uploadIdMarker: string | undefined;

            do {
                const response = await s3Client.send(
                    new ListMultipartUploadsCommand({
                        Bucket: bucketName,
                        KeyMarker: keyMarker,
                        UploadIdMarker: uploadIdMarker,
                    })
                );

                if (response.Uploads) {
                    for (const upload of response.Uploads) {
                        if (!upload.Initiated) continue;

                        const initiatedDate = new Date(upload.Initiated);
                        if (initiatedDate < sevenDaysAgo) {
                            logger.warn(
                                `🧹 Cleaning stuck multipart upload: key=${upload.Key}, uploadId=${upload.UploadId}, initiated=${initiatedDate.toISOString()}`
                            );
                            try {
                                await s3Client.send(
                                    new AbortMultipartUploadCommand({
                                        Bucket: bucketName,
                                        Key: upload.Key!,
                                        UploadId: upload.UploadId!,
                                    })
                                );
                            } catch (error: any) {
                                console.log("❌ Failed delete at ", upload.Key);
                            }
                        }
                    }
                }

                keyMarker = response.NextKeyMarker;
                uploadIdMarker = response.NextUploadIdMarker;
            } while (keyMarker && uploadIdMarker);

            logger.info("✅ Storage cleanup task finished");
            addTaskQueue("scan-storage", {});

        } catch (error: any) {
            logger.error(`❌ Failed to clean storage:`, error);
            taskQueueEvents.emit("taskFailed", "clean-storage");
            throw error;
        }
    },

    "clean-task": async () => {
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
            logger.error(`❌ Failed to clean task:`, error);
            taskQueueEvents.emit("taskFailed", "clean-task");
            throw error;
        }
    }
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