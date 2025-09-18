import { databasePath } from "@/data-source";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

export default async function backupDatabaseTask({ objectKey }: { objectKey: string }) {
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

        console.error(`❌ Failed to backup database:`, error);
        throw error;
    }
}