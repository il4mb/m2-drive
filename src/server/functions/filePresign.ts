import { getConnection } from "@/data-source";
import { createFunction } from "../funcHelper";
import { File } from "@/entities/File";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getFileURLPresign = createFunction(async ({ fileId }: { fileId: string }) => {

    const connection = await getConnection();
    const fileRepository = connection.getRepository(File);
    const file = (await fileRepository.findOneBy({ id: fileId, type: 'file' })) as File<'file'>;
    if (!file) {
        throw new Error("Failed: File tidak ditemukan!");
    }

    if (!file.meta?.Key) {
        throw new Error("Failed: File tidak memiliki object key!, ini biasa terjadi pada file upload korup.");
    }
    const objectKey = file.meta.Key;

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(`${file.name}.${file.meta.ext || 'bin'}`)}"`,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
        url,
        exp: Date.now() + (3600 * 1000) - 20_000
    }
})