import { getConnection } from "@/data-source";
import { File } from "@/entities/File";
import { withRetry } from "../taskQueue";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import imageSize from "image-size";
import { PassThrough } from "stream";
import { currentTime } from "@/libs/utils";
import { spawn } from "child_process";

export default async function generateThumbnailTask({ fileId, objectKey }: { fileId: string, objectKey: string }) {

    try {

        const connection = await getConnection();
        const fileRepository = connection.getRepository(File);

        const file = (await fileRepository.findOneByOrFail({ id: fileId })) as File<'file'>;

        const mime = file.meta?.mimeType || "";
        // Only allow image or video
        if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
            throw new Error(`Unsupported file type for thumbnail: ${mime}`);
        }

        let thumbnailKey: string | null = null;

        if (mime.startsWith("image/")) {
            thumbnailKey = `thumbnails/${fileId}.jpg`;

            // Get image from S3 with retry
            const { Body } = await withRetry(async () => {
                return s3Client.send(
                    new GetObjectCommand({ Bucket: bucketName, Key: objectKey })
                );
            });

            if (!Body) throw new Error("Image not found in S3");

            // For images, we need to download the entire file first to check dimensions
            const chunks: Buffer[] = [];
            for await (const chunk of Body as NodeJS.ReadableStream) {
                // @ts-ignore
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            const dimensions = imageSize(buffer);
            const { width = 0, height = 0 } = dimensions;

            if (width > 200 || height > 200) {
                // Resize to 200x200 max - create a new stream from the buffer
                const inputStream = new PassThrough();
                inputStream.end(buffer);

                const outputStream = new PassThrough();

                await runFfmpeg([
                    "-i", "pipe:0",
                    "-vf", "scale='min(200,iw)':'min(200,ih)':force_original_aspect_ratio=decrease",
                    "-f", "image2",
                    "pipe:1",
                ], inputStream, outputStream);

                // Collect the output
                const outputChunks: Buffer[] = [];
                for await (const chunk of outputStream) {
                    outputChunks.push(chunk);
                }
                const outputBuffer = Buffer.concat(outputChunks);

                await withRetry(async () => {
                    await s3Client.send(
                        new PutObjectCommand({
                            Bucket: bucketName,
                            Key: thumbnailKey!,
                            Body: outputBuffer,
                            ContentType: "image/jpeg",
                            ContentLength: outputBuffer.length,
                            ACL: "public-read",
                        })
                    );
                });
            } else {
                // Use original image if it's already small enough
                thumbnailKey = objectKey;
            }
        }

        if (mime.startsWith("video/")) {
            thumbnailKey = `thumbnails/${fileId}.jpg`;

            const { Body } = await withRetry(async () =>
                s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: objectKey }))
            );

            if (!Body) throw new Error("Video not found in S3");

            // For videos, we can stream directly
            const outputStream = new PassThrough();

            await runFfmpeg([
                "-i", "pipe:0",
                "-ss", "00:00:01.000",
                "-vframes", "1",
                "-vf", "scale='min(300,iw)':'min(300,ih)':force_original_aspect_ratio=decrease",
                "-f", "image2",
                "pipe:1"
            ], Body as NodeJS.ReadableStream, outputStream);

            const chunks: Buffer[] = [];
            for await (const chunk of outputStream) {
                chunks.push(chunk);
            }
            const outputBuffer = Buffer.concat(chunks);

            await withRetry(async () =>
                s3Client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: thumbnailKey!,
                    Body: outputBuffer,
                    ContentType: "image/jpeg",
                    ContentLength: outputBuffer.length,
                    ACL: "public-read",
                }))
            );
        }

        if (thumbnailKey) {
            // Update DB with retry
            await withRetry(async () => {
                await fileRepository.update(fileId, {
                    meta: () => `json_set(meta, '$.thumbnail', '${thumbnailKey}')`,
                    updatedAt: currentTime(),
                });
            });
        }

        console.info(`✅ Thumbnail ready for ${fileId}`);

    } catch (error) {
        console.error(`❌ Failed to generate thumbnail for ${fileId}:`, error);
        throw error;
    }
}

export async function runFfmpeg(args: string[], input: NodeJS.ReadableStream, output: PassThrough) {
    return new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", ["-y", ...args]);

        ffmpeg.on("error", reject);

        ffmpeg.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        input.pipe(ffmpeg.stdin);
        ffmpeg.stdout.pipe(output);
    });
}