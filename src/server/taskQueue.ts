import { bucketName, s3Client } from "@/libs/s3-storage";
import { TaskQueue } from "@/libs/TaskQueue";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// Define payload types for each handler
type TaskPayloads = {
    "delete-file": {
        objectKey: string;
    };
};

// src/server/taskQueue.ts
let started = false;
export const taskQueue = new TaskQueue(3);

const handlers = {
    "delete-file": async ({ objectKey }: TaskPayloads["delete-file"]) => {
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucketName,
                Key: objectKey
            })
        );
    },
};

type HandlerName = keyof typeof handlers;

export const addTaskQueue = <T extends HandlerName>(
    handler: T,
    payload: TaskPayloads[T]
) => {
    taskQueue.add(handler, payload);
};

export function startTaskQueue() {
    if (started) return;
    started = true;
    taskQueue.start(handlers);

    console.log("📦 Task queue started...");
}
