import { getConnection } from "@/data-source";
import { File, RegularFile } from "@/entities/File";
import { addTaskQueue, taskQueue, withRetry } from "../taskQueue";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import os from "os";
import { pipeline } from "stream/promises";
import { currentTime, generateKey } from "@/libs/utils";

const supportedMimes = new Set([
    // Word
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.text-template",
    "text/rtf",
    "application/wordperfect",

    // Excel
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.spreadsheet-template",
    "application/x-dif",

    // PowerPoint
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    "application/vnd.openxmlformats-officedocument.presentationml.template",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.presentation-template",
]);

export const isConvertable = (mime: string) => supportedMimes.has(mime);


export const addPdfConvertTask = async (file: File) => {

    if (file.type != "file") {
        return;
    }
    const targetFile = file as RegularFile;
    if (targetFile.type == "file" && isConvertable(targetFile.meta?.mimeType || '') || !targetFile.meta?.pdfObjectKey) {
        const exist = await taskQueue.some(e => e.type == "convert-pdf" && e.payload.fileId == file.id);
        if (exist) {
            return;
        }
        addTaskQueue("convert-pdf", { fileId: targetFile.id });
    }
}

export default async function pdfConvertTask({ fileId }: { fileId: string }) {

    const connection = await getConnection();
    const fileRepository = connection.getRepository(File);
    const file = (await fileRepository.findOneByOrFail({ id: fileId })) as File<"file">;
    const mime = file.meta?.mimeType || "";
    const objectKey = file.meta?.Key;

    if (!objectKey) throw new Error("Object key does not exist in file!");
    if (!supportedMimes.has(mime)) {
        throw new Error(`Unsupported file type for PDF conversion: ${mime}`);
    }

    // download dari S3
    const { Body } = await withRetry(async () =>
        s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: objectKey }))
    );

    // file sementara
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, path.basename(objectKey));
    const outputPath = path.join(tmpDir, path.basename(objectKey, path.extname(objectKey)) + ".pdf");

    // simpan sementara
    await pipeline(Body as NodeJS.ReadableStream, fs.createWriteStream(inputPath));

    // kalau sudah pdf → skip konversi
    if (mime === "application/pdf") {
        fs.copyFileSync(inputPath, outputPath);
    } else {
        await new Promise<void>((resolve, reject) => {
            exec(`libreoffice --headless --convert-to pdf "${inputPath}" --outdir "${tmpDir}"`, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    // upload hasil PDF ke S3
    const pdfKey = `converted/${generateKey(18)}`;
    const pdfBuffer = fs.readFileSync(outputPath);

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: pdfKey,
            Body: pdfBuffer,
            ContentType: "application/pdf",
        })
    );

    // @ts-ignore update file.meta
    file.meta = {
        ...file.meta,
        pdfObjectKey: pdfKey,
        pdfConvertedAt: currentTime()
    };
    await fileRepository.save(file);

    // bersihkan tmp
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
}
