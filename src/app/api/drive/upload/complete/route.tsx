import { getSource } from "@/data-source";
import { DriveFile } from "@/entity/DriveFile";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { currentTime, generateKey } from "@/libs/utils";
import { withApi } from "@/libs/withApi";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

export const POST = withApi(async (req) => {

    const json = await req.json();

    if (
        !json.fileName
        || !json.fileType
        || !json.fileSize
        || !json.Key
        || !json.UploadId
        || !Array.isArray(json.etags)
        || !json.etags.length
    ) throw new Error("400: Invalid request!");

    const uId = "1";
    const fileName = json.fileName;
    const fileType = json.fileType;
    const fileSize = json.fileSize;
    const fId = json.fId || null;
    const UploadId = json.UploadId;
    const etags = json.etags;
    const Key = json.Key;


    try {

        await s3Client.send(
            new CompleteMultipartUploadCommand({
                Bucket: bucketName,
                Key,
                UploadId,
                MultipartUpload: {
                    Parts: etags,
                },
            })
        );

        // await s3Client.send(
        //     new PutObjectAclCommand({
        //         Bucket: bucketName,
        //         Key: key,
        //         ACL: "public-read",
        //     })
        // );
    } catch (err: any) {

        const msg = err?.message || "";
        const isAlreadyInProgress = msg.includes("Upload already in progress") || msg.includes("multipart completion is already in progress");
        if (!isAlreadyInProgress) {
            throw err;
        }
    }


    const source = await getSource();
    const repository = source.getRepository(DriveFile);
    const file = new DriveFile();

    file.id = generateKey(12);
    file.uId = uId;
    file.fId = fId;
    file.name = fileName;
    file.type = "file";
    file.createdAt = currentTime();
    file.meta = {
        size: fileSize,
        mimeType: fileType,
        Key
    }
    repository.save(file);

    return {
        status: true,
        message: "Finished upload successfully",
        data: JSON.parse(JSON.stringify(file))
    };
});

