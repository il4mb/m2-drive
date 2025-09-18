import { getConnection } from "@/data-source";
import { File } from "@/entities/File";
import User from "@/entities/User";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { currentTime } from "@/libs/utils";
import { ListMultipartUploadsCommand, ListObjectsV2Command, ListObjectVersionsCommand } from "@aws-sdk/client-s3";

export default async function scanStorageTask() {

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

        const convertedKeys = (await fileRepo
            .createQueryBuilder("f")
            .leftJoin(User, "u", "u.id = f.uId")
            .select(`json_extract(f.meta, '$.pdfObjectKey')`, "pdfObjectKey")
            .where(`json_extract(f.meta, '$.pdfObjectKey') IS NOT NULL`)
            .andWhere("u.id IS NOT NULL")
            .getRawMany<{ pdfObjectKey: string }>())
            .map(f => f.pdfObjectKey);

        const usersIdSet = new Set(usersId);
        const filesKeySet = new Set(filesKey);
        const thumbnailKeySet = new Set(thumbnailsKey);
        const convertedKeysSet = new Set(convertedKeys);

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
                    } else if (key.startsWith("converted/")) {
                        exists = convertedKeysSet.has(key.trim());
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
        console.error(`❌ Failed to scan storage:`, error);
        throw error;
    }
}