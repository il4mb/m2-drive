import { bucketName, s3Client } from "@/libs/s3-storage";
import { ListMultipartUploadsCommand, ListObjectsV2Command, ListObjectVersionsCommand } from "@aws-sdk/client-s3";
import { getConnection } from "@/data-source";
import { File } from "@/entities/File";
import User from "@/entities/User";
import { createFunction } from "../funcHelper";


export type SummaryData = {
    totalStorageSize: number;
    totalGarbage: number;
    garbageSize: number;
    garbageItems: {
        key: string;
        size: number;
    }[];
}

export const getStorageSummary = createFunction(async () => {

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
        .leftJoin(User, "u", "u.id = f.uId")
        .select(`json_extract(f.meta, '$.Key')`, "Key")
        .where(`json_extract(f.meta, '$.Key') IS NOT NULL`)
        .andWhere("u.id IS NULL")
        .getRawMany<{ Key: string }>())
        .map(f => f.Key);

    let continuationToken: string | undefined;
    let totalSize = 0;
    const garbage: { key: string; size: number }[] = [];

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
                totalSize += size;

                let exists = false;

                if (key.startsWith("avatars/")) {
                    exists = usersId.includes(key.replace("avatars/", ""));
                } else {
                    exists = filesKey.includes(key);
                }

                if (!exists) {
                    garbage.push({ key, size });
                }
            }
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

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



    return {
        totalStorageSize: totalSize + versionedSize,
        totalGarbage: garbage.length,
        garbageSize: garbage.reduce((s, g) => s + g.size, 0),
        garbageItems: garbage,
    }
})



export const getStorageSummary2 = createFunction(async () => {
    
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
                objects.push({ key: obj.Key!, size: obj.Size ?? 0 });
                totalSize += obj.Size ?? 0;
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
        initiated: u.Initiated,
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

    return {

        committed: {
            count: objects.length,
            size: totalSize,
        },
        multipart: {
            count: multipartKeys.length,
            uploads: multipartKeys,
        },
        versions: {
            count: versions.length,
            size: versionedSize,
        },
        total: totalSize + versionedSize,
    };
})