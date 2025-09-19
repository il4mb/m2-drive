import { getConnection } from "@/data-source";
import { createFunction } from "../funcHelper";
import { File } from "@/entities/File";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getFileURLPresign = createFunction(
    async ({ fileId, metaKey = "Key", download = false, objectKey: initKey, fileName }: {
        fileId?: string;
        metaKey?: string;
        download?: boolean;
        objectKey?: string;
        fileName?: string;
    }) => {


        if (initKey) {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: initKey,
                ...(download && {
                    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(`${fileName || 'download'}`)}"`,
                })
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return {
                url,
                exp: Date.now() + (3600 * 1000) - 20_000
            }
        }


        const connection = await getConnection();
        const fileRepository = connection.getRepository(File);
        const file = (await fileRepository.findOneBy({ id: fileId, type: 'file' })) as File<'file'>;
        if (!file) {
            throw new Error("Failed: File tidak ditemukan!");
        }

        if (!Object.keys(file.meta || {}).includes(metaKey)) {
            throw new Error(`Failed: Meta key ${metaKey}! tidak ditemukan pada file.`);
        }
        // @ts-ignore
        const objectKey = (file.meta || {})[metaKey] as string;
        if (!objectKey) {
            throw new Error(`Failed: Meta ${metaKey} tidak memiliki nilai!, ini biasa terjadi pada file upload korup.`);
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            ...(download && {
                ResponseContentDisposition: `attachment; filename="${encodeURIComponent(`${file.name}.${file.meta?.ext || 'bin'}`)}"`,
            })
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return {
            url,
            exp: Date.now() + (3600 * 1000) - 20_000
        }
    })