import { getConnection } from "@/data-source";
import { Task } from "@/entities/Task";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { In } from "typeorm";

const MAX_BACKUPS = 7;

export default async function cleanOldBackupTask() {
    try {

        const listResp = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: "backup/",
            })
        )
        const backups = (listResp.Contents || [])
            .sort(
                (a, b) =>
                    (b.LastModified?.getTime() || 0) -
                    (a.LastModified?.getTime() || 0)
            )
            
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
        console.error(`❌ Failed to delete old backups:`, error);
        throw error;
    }
}