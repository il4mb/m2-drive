import { getConnection } from "@/data-source";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { addTaskQueue } from "../taskQueue";
import { currentTime, generateKey } from "@/libs/utils";
import { Task } from "@/entities/Task";

export default async function backupDatabaseTask({ objectKey }: { objectKey: string }) {

    const tmpFile = join("/tmp", `backup-${Date.now()}.sqlite`);

    try {
        // Ensure objectKey prefix
        if (!objectKey.startsWith("backup/")) {
            throw new Error("Object Key must start with backup/");
        }

        const connection = await getConnection();
        await connection.query(`VACUUM INTO '${tmpFile}'`);

        // Read snapshot and upload to S3
        const buffer = readFileSync(tmpFile);
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
                Body: buffer,
                ContentType: "application/x-sqlite3",
                ACL: "private",
            })
        );

        console.log("✅ Safe backup uploaded:", objectKey);
    } catch (error) {
        console.error("❌ Failed to backup database:", error);
        throw error;
    } finally {
        try { unlinkSync(tmpFile); } catch { }
    }
}


export const addBackupTask = async () => {

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const fiveMinuteAgo = currentTime("-5m");

    const exist = await taskRepository.createQueryBuilder("t")
        .where("t.type = :type", { type: "backup-database" })
        .andWhere("t.createdAt > :fiveMinuteAgo", { fiveMinuteAgo })
        .andWhere("t.status IN (:...status)", { status: ["pending", "processing"] })
        .getOne();

    if (exist) return;

    addTaskQueue(
        "backup-database",
        { objectKey: `backup/${generateKey(12)}` },
        10
    );
}