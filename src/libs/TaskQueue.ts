import { getConnection } from "@/data-source";
import { Task, TaskStatus } from "@/entities/Task";
import { EventEmitter } from "events";
import { createLogger } from "@/libs/logger";
import { performance } from "perf_hooks";
import { currentTime } from "./utils";
import { requestContext } from "./requestContext";

const logger = createLogger("task-queue");

export type TaskHandler<P> = (payload: P) => Promise<void>;
export type TaskHandlerMap<PayloadMap extends Record<string, object>> = {
    [K in keyof PayloadMap]: (payload: PayloadMap[K]) => Promise<void>;
};

interface TaskQueueOptions {
    concurrency?: number;
    pollingTime?: number;
    maxRetries?: number;
    retryDelay?: number;
}

interface TaskMetrics {
    processed: number;
    succeeded: number;
    failed: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
}

export class TaskQueue extends EventEmitter {
    private isProcessing = false;
    private interval: NodeJS.Timeout | null = null;
    private pollingTime: number;
    private concurrency: number;
    private maxRetries: number;
    private retryDelay: number;
    private currentlyProcessing = new Set<string>();
    private metrics: TaskMetrics = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0
    };

    constructor(options: TaskQueueOptions = {}) {
        super();
        this.concurrency = options.concurrency || 1;
        this.pollingTime = options.pollingTime || 2000;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5000;
    }

    async add<T>(type: string, payload: T, priority: number = 0) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        const task = repo.create({
            type,
            payload,
            status: "pending" as TaskStatus,
            priority,
            createdAt: currentTime(), // Store as epoch number
            retryCount: 0
        });

        await requestContext.run({ user: "system" }, async () => await repo.save(task))

        this.emit('taskAdded', task);
        logger.debug(`Task added: ${type}`, { taskId: task.id });

        return task;
    }

    private async processTask<T>(task: Task<T>, handler: (payload: T) => Promise<void>) {
        const startTime = performance.now();
        const taskId = task.id;

        if (this.currentlyProcessing.has(taskId)) {
            logger.warn(`Task ${taskId} is already being processed`);
            return;
        }

        this.currentlyProcessing.add(taskId);

        const source = await getConnection();
        const repo = source.getRepository(Task);

        try {
            // Update task status to processing
            task.status = "processing" as TaskStatus;
            task.startedAt = currentTime(); // Store as epoch number
            task.updatedAt = currentTime(); // Store as epoch number
            await requestContext.run({ user: "system" }, async () => await repo.save(task))

            this.emit('taskStart', task);
            logger.info(`Processing task: ${task.type}`, { taskId });

            // Execute the task handler
            await handler(task.payload);

            // Update task status to completed
            task.status = "completed" as TaskStatus;
            task.completedAt = currentTime(); // Store as epoch number
            task.updatedAt = currentTime(); // Store as epoch number
            await requestContext.run({ user: "system" }, async () => await repo.save(task))

            const processingTime = performance.now() - startTime;
            this.updateMetrics(true, processingTime);

            this.emit('taskComplete', task, processingTime);
            logger.info(`Task completed: ${task.type}`, {
                taskId,
                processingTime: `${processingTime.toFixed(2)}ms`
            });

        } catch (error: any) {
            const processingTime = performance.now() - startTime;
            const errorMessage = error.message || "Unknown error";

            // Handle retries
            if (task.retryCount < this.maxRetries) {
                task.status = "pending" as TaskStatus;
                task.retryCount++;
                task.error = errorMessage;
                task.updatedAt = currentTime(); // Store as epoch number
                await requestContext.run({ user: "system" }, async () => await repo.save(task))

                this.emit('taskRetry', task, error, task.retryCount);
                logger.warn(`Task will be retried: ${task.type}`, {
                    taskId,
                    retryCount: task.retryCount,
                    error: errorMessage
                });
            } else {
                // Mark as failed after max retries
                task.status = "failed" as TaskStatus;
                task.error = errorMessage;
                task.completedAt = currentTime(); // Store as epoch number
                task.updatedAt = currentTime(); // Store as epoch number
                await requestContext.run({ user: "system" }, async () => await repo.save(task))

                this.updateMetrics(false, processingTime);
                this.emit('taskFailed', task, error);
                logger.error(`Task failed after ${task.retryCount} retries: ${task.type}`, {
                    taskId,
                    error: errorMessage
                });
            }
        } finally {
            this.currentlyProcessing.delete(taskId);
        }
    }

    private updateMetrics(success: boolean, processingTime: number) {
        this.metrics.processed++;
        this.metrics.totalProcessingTime += processingTime;
        this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.processed;

        if (success) {
            this.metrics.succeeded++;
        } else {
            this.metrics.failed++;
        }
    }

    async getPendingTasks(limit: number = 10) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        return await repo.find({
            where: { status: "pending" as TaskStatus },
            order: {
                priority: "DESC",
                createdAt: "ASC"
            },
            take: limit
        });
    }

    async start<T extends Record<string, object>>(handlerMap: TaskHandlerMap<T>) {
        if (this.isProcessing) {
            logger.warn("Task queue is already running");
            return;
        }

        this.isProcessing = true;
        logger.info(`Starting task queue with concurrency: ${this.concurrency}`);

        this.interval = setInterval(async () => {
            try {
                // Check how many tasks we can process
                const availableSlots = this.concurrency - this.currentlyProcessing.size;
                if (availableSlots <= 0) return;

                // Get pending tasks
                const pendingTasks = await this.getPendingTasks(availableSlots);

                for (const task of pendingTasks) {
                    const handler = handlerMap[task.type as keyof T];
                    if (!handler) {
                        logger.error(`No handler found for task type: ${task.type}`);
                        continue;
                    }

                    // Process task in background (don't await)
                    this.processTask(task, handler as any).catch(error => {
                        logger.error(`Unhandled error in task processing: ${task.type}`, error);
                    });
                }
            } catch (error) {
                logger.error("Error in task queue processing loop", error);
                this.emit('error', error);
            }
        }, this.pollingTime);

        this.emit('start');
    }

    async stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.isProcessing = false;
        logger.info("Task queue stopped");
        this.emit('stop');
    }

    async pause() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isProcessing = false;
        logger.info("Task queue paused");
        this.emit('pause');
    }

    async resume() {
        if (!this.isProcessing && this.interval === null) {
            this.start({} as any).catch(error => {
                logger.error("Failed to resume task queue", error);
            });
        }
    }

    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentlyProcessing: this.currentlyProcessing.size,
            concurrency: this.concurrency,
            metrics: { ...this.metrics }
        };
    }

    async cleanupOldTasks(days: number = 30) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        // Calculate cutoff date in epoch format
        const cutoffEpoch = currentTime() - (days * 24 * 60 * 60); // days to seconds

        const result = await repo.createQueryBuilder()
            .delete()
            .where("completedAt < :cutoffEpoch", { cutoffEpoch })
            .andWhere("status IN (:...statuses)", {
                statuses: ["completed", "failed"] as TaskStatus[]
            })
            .execute();

        logger.info(`Cleaned up ${result.affected} old tasks`);
        return result.affected || 0;
    }

    async getTaskById(id: string) {
        const source = await getConnection();
        const repo = source.getRepository(Task);
        return await repo.findOneBy({ id });
    }

    async retryTask(id: string) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        const task = await repo.findOneBy({ id });
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }

        if (task.status !== "failed") {
            throw new Error(`Cannot retry task with status: ${task.status}`);
        }

        task.status = "pending" as TaskStatus;
        task.retryCount = 0;
        task.error = null;
        task.updatedAt = currentTime(); // Store as epoch number

        await requestContext.run({ user: "system" }, async () => await repo.save(task))
        this.emit('taskManualRetry', task);

        return task;
    }
}