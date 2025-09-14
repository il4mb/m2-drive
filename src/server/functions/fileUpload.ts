import { AbortMultipartUploadCommand, CompletedPart, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, ListMultipartUploadsCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { createFunction, writeActivity } from "../funcHelper";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { currentTime, generateKey } from "@/libs/utils";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConnection } from "@/data-source";
import { File } from "@/entities/File";
import { getRequestContext } from "@/libs/requestContext";
import { IsNull, Repository } from "typeorm";
import { addTaskQueue } from "../taskQueue";

type InitProps = {
    Key?: string;
    UploadId?: string;
    fileType: string;
    fileName: string;
    fileSize: number;
}
export const initUpload = createFunction(async ({ Key, fileType: ContentType }: InitProps) => {

    // otherwise generate new
    const objKey = Key || `drive/${generateKey(18)}`;

    // 🔍 check if there's already an incomplete multipart upload
    const listCommand = new ListMultipartUploadsCommand({
        Bucket: bucketName,
        Prefix: objKey,
    });
    const listResp = await s3Client.send(listCommand);

    let existingUploadId: string | undefined;

    if (listResp.Uploads) {
        const found = listResp.Uploads.find((u) => u.Key === objKey);
        if (found) {
            existingUploadId = found.UploadId;
        }
    }

    // ✅ If we found one, return it instead of creating new
    if (existingUploadId) {
        return {
            Key: objKey,
            UploadId: existingUploadId,
        }
    }

    // 🚀 Otherwise start new upload
    const createCommand = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: objKey,
        ContentType,
    });
    const response = await s3Client.send(createCommand);

    if (!response.UploadId || !response.Key) {
        throw new Error("500: Failed to init upload");
    }

    return {
        Key: response.Key,
        UploadId: response.UploadId,
    }
})


type PresignProps = {
    Key: string;
    UploadId: string;
    PartNumber: number;

}
export const getUploadURLPresign = createFunction(async ({ Key, UploadId, PartNumber }: PresignProps) => {

    const command = new UploadPartCommand({
        Bucket: bucketName,
        Key,
        UploadId,
        PartNumber
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
})


type CompleteProps = {
    fileName: string;
    fileType: string;
    fileSize: number;
    folderId: string | null;
    Key: string;
    UploadId: string;
    etags: CompletedPart[];

}
export const completeUpload = createFunction(async ({ folderId, fileName: nameFile, fileType, fileSize, Key, UploadId, etags }: CompleteProps) => {

    const { user } = getRequestContext();
    if (!user || typeof user == 'string') {
        throw new Error("Failde Complete Upload: Missing userId");
    }

    const uId = user.id;

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

    const fileName = nameFile.replace(/\.[^.]+$/, '');
    const fileExt = nameFile.match(/\.([^.]+)$/)?.[1] || '';

    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const folder: File | null = await (folderId ? fileRepository.findOneBy({ id: folderId }) : null);

    const file = fileRepository.create({
        id: generateKey(8),
        uId,
        pId: folder?.id || null,
        name: await getUniqueName(fileName, folderId, uId, fileRepository),
        type: "file",
        createdAt: currentTime(),
        meta: {
            size: fileSize,
            mimeType: fileType,
            ext: fileExt,
            generalPermit: 'none',
            Key
        }
    })

    await fileRepository.save(file);

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


type AbortProps = {
    Key: string;
    UploadId: string;
}
export const abortUpload = createFunction(async ({ Key, UploadId }: AbortProps) => {
    await s3Client.send(
        new AbortMultipartUploadCommand({
            Bucket: bucketName,
            Key,
            UploadId,
        })
    );
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