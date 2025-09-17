import { getConnection } from "@/data-source";
import { createFunction } from "../funcHelper";
import { addTaskQueue } from "../taskQueue";
import { Task } from "@/entities/Task";
import { In } from "typeorm";
import { checkPermission } from "../checkPermission";
import { bucketName, s3Client } from "@/libs/s3-storage";
import { GetBucketCorsCommand, PutBucketCorsCommand, CORSRule as AWSCORSRule } from "@aws-sdk/client-s3";

export const scanStorage = createFunction(async () => {

    await checkPermission("can-manage-drive-root");
    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const exist = await taskRepository.findOneBy({ type: "scan-storage", status: In(["pending", "processing"]) });
    if (exist) throw new Error("Task sudah ada mohon bersabar, dasbor akan update otomatis setelah task selesai!");
    addTaskQueue("scan-storage", {});
});


export const cleanStorage = createFunction(async () => {

    await checkPermission("can-manage-drive-root");
    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const exist = await taskRepository.findOneBy({ type: "clean-storage", status: In(["pending", "processing"]) });
    if (exist) throw new Error("Task sudah ada mohon bersabar, dasbor akan update otomatis setelah task selesai!");
    addTaskQueue("clean-storage", {});
});




export type CORSRule = {
    ID: string;
    AllowedOrigins: string[];
    AllowedHeaders: string[];
    AllowedMethods: string[];
    ExposeHeaders: string[];
    MaxAgeSeconds: number;
}

type UpdateCorsOption = {
    rules: CORSRule[];
}

export const updateCorsOption = createFunction(async ({ rules }: UpdateCorsOption): Promise<CORSRule[]> => {
    await checkPermission("can-manage-drive-root");

    // Validate rules
    if (!rules || !Array.isArray(rules)) {
        throw new Error("Invalid rules format");
    }

    // Convert to AWS format
    const awsRules: AWSCORSRule[] = rules.map(rule => ({
        ID: rule.ID,
        AllowedOrigins: rule.AllowedOrigins,
        AllowedHeaders: rule.AllowedHeaders,
        AllowedMethods: rule.AllowedMethods,
        ExposeHeaders: rule.ExposeHeaders,
        MaxAgeSeconds: rule.MaxAgeSeconds
    }));

    await s3Client.send(
        new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: { CORSRules: awsRules },
        })
    );

    return rules;
});

export const getCorsOptions = createFunction(async (): Promise<CORSRule[]> => {
    await checkPermission("can-manage-drive-root");
    try {
        const current = await s3Client.send(
            new GetBucketCorsCommand({ Bucket: bucketName })
        );

        // Convert AWS format to our format
        const rules: CORSRule[] = (current.CORSRules ?? []).map(rule => ({
            ID: rule.ID || '',
            AllowedOrigins: rule.AllowedOrigins || [],
            AllowedHeaders: rule.AllowedHeaders || [],
            AllowedMethods: rule.AllowedMethods || [],
            ExposeHeaders: rule.ExposeHeaders || [],
            MaxAgeSeconds: rule.MaxAgeSeconds || 3600
        }));

        return rules;
    } catch (err: any) {
        if (err.name === "NoSuchCORSConfiguration") {
            return [];
        }
        console.error(err);
        throw err;
    }
});