import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import * as https from "https";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
if (!S3_ENDPOINT) throw new Error("S3_ENDPOINT is not defined");
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
if (!S3_ACCESS_KEY) throw new Error("S3_ACCESS_KEY is not defined");
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
if (!S3_SECRET_KEY) throw new Error("S3_SECRET_KEY is not defined");
export const bucketName = process.env.S3_BUCKET_NAME as string;
if (!bucketName) throw new Error("S3_BUCKET_NAME is not defined");
export const baseUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}`


export const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: S3_ENDPOINT as string,
    credentials: {
        accessKeyId: S3_ACCESS_KEY as string,
        secretAccessKey: S3_SECRET_KEY as string,
    },
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
        httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV === "development" ? false : true,
        }),
    }),
});



/**
 * Upload a file to the S3 bucket and return its public URL
 * @param file - The File or Blob to upload
 * @returns Public URL string
 */
export const putPublicObject = async (file: File, key: string): Promise<string> => {

    if (!file) throw new Error("No file provided");
    // Convert File to Buffer (Node.js environment)
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            ACL: "public-read",
        })
    );

    return `${baseUrl}/${key}`;
};


/**
 * Upload a buffer to the S3 bucket and return its public URL
 * @param buffer - The file contents as a Buffer
 * @param filename - Original filename (used for key & content-type)
 * @param contentType - MIME type of the file
 */
export const putPublicObjectFromBuffer = async (
    buffer: Buffer,
    key: string,
    contentType: string
): Promise<string> => {

    if (!buffer || !key) throw new Error("Invalid file data");

    const objectKey = key.replace(/^\/+/, '');
    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: buffer,
            ContentType: contentType,
            ACL: "public-read",
        })
    );

    return `${baseUrl}/${objectKey}`
};