import { getConnection } from "@/data-source";
import { addTaskQueue } from "../taskQueue";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { AbortMultipartUploadCommand, ListMultipartUploadsCommand } from "@aws-sdk/client-s3";
import Storage from "@/entities/Storage";

export default async function cleanStorageTask() {
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
                        console.warn(
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

        console.info("✅ Storage cleanup task finished");
        addTaskQueue("scan-storage", {});

    } catch (error: any) {
        console.error(`❌ Failed to clean storage:`, error);
        throw error;
    }
}