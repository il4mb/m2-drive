import { getConnection } from "@/data-source";
import { TaskQueueItem, TaskStatus } from "@/entity/TaskQueueItem";

export class TaskQueue {

    private isProcessing = false;
    private interval: NodeJS.Timeout | null = null;
    private pollingTime = 2000;

    constructor(private concurrency = 1) { }

    async add<T>(type: string, payload: T) {
        const source = await getConnection();
        const repo = source.getRepository(TaskQueueItem);
        const task = repo.create({
            type,
            payload,
            status: "pending",
            createdAt: Date.now(),
        });
        await repo.save(task);
        return task;
    }

    async processTask<T>(task: TaskQueueItem<T>, handler: (payload: T) => Promise<void>) {

        const source = await getConnection();
        const repo = source.getRepository(TaskQueueItem);

        task.status = "processing";
        task.updatedAt = Date.now();
        await repo.save(task);

        try {
            await handler(task.payload);
            task.status = "completed";
        } catch (err: any) {
            task.status = "failed";
            task.error = err.message || "Unknown error";
            task.retryCount++;
        }
        task.updatedAt = Date.now();
        await repo.save(task);
    }

    async start<T>(handlerMap: Record<string, (payload: any) => Promise<void>>) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        this.interval = setInterval(async () => {
            const source = await getConnection();
            const repo = source.getRepository(TaskQueueItem);

            const pendingTasks = await repo.find({
                where: { status: "pending" as TaskStatus },
                order: { createdAt: "ASC" },
                take: this.concurrency,
            });

            for (const task of pendingTasks) {
                const handler = handlerMap[task.type];
                if (!handler) continue;
                this.processTask(task, handler);
            }
        }, this.pollingTime);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.isProcessing = false;
    }
}
