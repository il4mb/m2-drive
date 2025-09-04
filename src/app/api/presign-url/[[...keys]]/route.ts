import { getConnection } from "@/data-source";
import { File } from "@/entity/File";
import { withApi } from "@/libs/withApi";
import { s3Client, bucketName } from "@/libs/s3-storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const GET = withApi(async (req, res) => {

    const { keys } = await res.params;
    const objectKey = keys.join("/")

    // const { searchParams } = new URL(req.url);
    // const fileId = searchParams.get("id");
    // if (!fileId) throw new Error("400: Invalid request!" + req.url);

    // const source = await getConnection();
    // const repository = source.getRepository(File);
    // const file = await repository.findOneBy({ id: fileId });

    // if (!file) throw new Error("404: File object not found!");
    // if (file.type !== "file") throw new Error("400: Only type file has presign-url!");
    // if (!file.meta?.Key) throw new Error("400: File meta doesn't have Key object!");

    // ✅ Generate presigned URL
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
        status: true,
        message: "Ok",
        data: {
            url,
            exp: Date.now() + (3600 * 1000) - 20_000
        },
    };
});
