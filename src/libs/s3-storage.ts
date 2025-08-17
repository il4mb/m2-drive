import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import crypto from "crypto";
import { Readable } from "stream";
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