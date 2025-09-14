import { getCurrentToken } from "@/actions/current-session";
import { getConnection } from "@/data-source";
import { File } from "@/entities/File";
import { requestContext } from "@/libs/requestContext";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { currentTime, generateKey } from "@/libs/utils";
import { withApi } from "@/libs/withApi";
import { getUserByToken } from "@/server/auth";
import { writeActivity } from "@/server/funcHelper";
import { addTaskQueue } from "@/server/taskQueue";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { IsNull, Repository } from "typeorm";

type CompleteRequestProps = {
    fileName: string;
    fileType: string;
    fileSize: number;
    fId: string | null;
    Key: string;
    UploadId: string;
    etags: Array<{ ETag: string, PartNumber: number }>;
}
export const POST = withApi(async (req) => {

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const token = await getCurrentToken();
    const user = await getUserByToken(token);
    const json = await req.json() as CompleteRequestProps;

    if (
        !json.fileName
        || !json.fileType
        || !json.fileSize
        || !json.Key
        || !json.UploadId
        || !Array.isArray(json.etags)
        || !json.etags.length
    ) throw new Error("400: Invalid request!");

    const connection = getConnection();
    let folder: File | null = await (json.fId ? (await connection).getRepository(File).findOneBy({ id: json.fId }) : null);

    const uId = user.id as string;
    const fileName = json.fileName.replace(/\.[^.]+$/, '');
    const fileExt = json.fileName.match(/\.([^.]+)$/)?.[1] || '';
    const fileType = json.fileType as string;
    const fileSize = json.fileSize as number;
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
        )

    } catch (err: any) {

        console.log(err)
        const msg = err?.message || "";
        const isAlreadyInProgress = msg.includes("Upload already in progress") || msg.includes("multipart completion is already in progress");
        if (!isAlreadyInProgress) {
            throw err;
        }
    }


    await requestContext.run({ user, ipAddress, userAgent }, async () => {

        const source = await getConnection();
        const repository = source.getRepository(File);
        const file = new File();

        file.id = generateKey(8);
        file.uId = uId;
        file.pId = fId;
        file.name = await getUniqueName(fileName, fId, uId, repository);
        file.type = "file";
        file.createdAt = currentTime();
        file.meta = {
            size: fileSize,
            mimeType: fileType,
            ext: fileExt,
            generalPermit: 'none',
            Key
        }
        await repository.save(file);

        const metadata: any = { fileId: file.id }
        if (file.pId) {
            metadata.folderId = file.pId;
        }

        writeActivity(
            "UPLOAD_FILE",
            `Mengupload ${file.type} ${file.name} ke ${folder?.name || 'My Drive'}`,
            metadata
        );

        if (fileType.startsWith("image/") || fileType.startsWith("video/")) {
            addTaskQueue("generate-thumbnail", {
                fileId: file.id,
                objectKey: Key
            })
        }
    })

    return {
        status: true,
        message: "Finished upload successfully"
    };
});


const getUniqueName = async (baseName: string, parentId: string | null, ownerId: string, fileRepository: Repository<File>): Promise<string> => {
    const siblings = await fileRepository.find({
        where: {
            pId: parentId || IsNull(),
            uId: ownerId
        }
    });

    const siblingNames = new Set(siblings.map(s => s.name));
    if (!siblingNames.has(baseName)) return baseName;

    let counter = 1;
    let newName = `${baseName} (1)`;
    while (siblingNames.has(newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
    }
    return newName;
};