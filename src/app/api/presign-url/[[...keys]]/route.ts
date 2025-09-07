import { withApi } from "@/libs/withApi";
import { s3Client, bucketName } from "@/libs/s3-storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const GET = withApi(async (req, res) => {

    const { keys } = await res!.params;
    const objectKey = keys.join("/")

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
