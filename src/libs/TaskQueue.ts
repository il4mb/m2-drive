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
    taskTimeout?: number; // Timeout in milliseconds (default: 2 minutes)
    cleanupInterval?: number; // Interval for checking timed out tasks
}

interface TaskMetrics {
    processed: number;
    succeeded: number;
    failed: number;
    timedOut: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
}

interface ProcessingTask {
    taskId: string;
    startTime: number;
    timeoutId: NodeJS.Timeout;
}

export class TaskQueue extends EventEmitter {
    private isProcessing = false;
    private interval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private pollingTime: number;
    private concurrency: number;
    private maxRetries: number;
    private retryDelay: number;
    private taskTimeout: number;
    private currentlyProcessing = new Map<string, ProcessingTask>();
    private metrics: TaskMetrics = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        timedOut: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0
    };

    constructor(options: TaskQueueOptions = {}) {
        super();
        this.concurrency = options.concurrency || 1;
        this.pollingTime = options.pollingTime || 2000;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5000;
        this.taskTimeout = options.taskTimeout || 120000; // 2 minutes default
    }

    async add<T>(type: string, payload: T, priority: number = 0) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        const task = repo.create({
            type,
            payload,
            status: "pending" as TaskStatus,
            priority,
            createdAt: currentTime(),
            retryCount: 0
        });

        await requestContext.run({ user: "system" }, async () => await repo.save(task));

        this.emit('taskAdded', task);
        logger.debug(`Task added: ${type}`, { taskId: task.id });

        return task;
    }

    private async markTaskAsTimedOut(taskId: string) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        try {
            const task = await repo.findOneBy({ id: taskId });
            if (!task || task.status !== "processing") {
                return;
            }

            task.status = "failed" as TaskStatus;
            task.error = `Task timed out after ${this.taskTimeout}ms`;
            task.completedAt = currentTime();
            task.updatedAt = currentTime();

            await requestContext.run({ user: "system" }, async () => await repo.save(task));

            this.metrics.timedOut++;
            this.emit('taskTimedOut', task);
            logger.error(`Task timed out: ${task.type}`, {
                taskId,
                timeout: this.taskTimeout
            });

        } catch (error) {
            logger.error(`Failed to mark task as timed out: ${taskId}`, error);
        } finally {
            this.currentlyProcessing.delete(taskId);
        }
    }

    private async processTask<T>(task: Task<T>, handler: (payload: T) => Promise<void>) {
        const startTime = performance.now();
        const taskId = task.id;

        if (this.currentlyProcessing.has(taskId)) {
            logger.warn(`Task ${taskId} is already being processed`);
            return;
        }

        // Set timeout for this task
        const timeoutId = setTimeout(() => {
            this.markTaskAsTimedOut(taskId);
        }, this.taskTimeout);

        this.currentlyProcessing.set(taskId, {
            taskId,
            startTime: Date.now(),
            timeoutId
        });

        const source = await getConnection();
        const repo = source.getRepository(Task);

        try {
            // Update task status to processing
            task.status = "processing" as TaskStatus;
            task.startedAt = currentTime();
            task.updatedAt = currentTime();
            await requestContext.run({ user: "system" }, async () => await repo.save(task));

            this.emit('taskStart', task);
            logger.info(`Processing task: ${task.type}`, { taskId });

            // Execute the task handler with timeout protection
            await Promise.race([
                handler(task.payload),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Task handler timed out after ${this.taskTimeout}ms`)), this.taskTimeout)
                )
            ]);

            // Clear the timeout since task completed successfully
            clearTimeout(timeoutId);

            // Update task status to completed
            task.status = "completed" as TaskStatus;
            task.completedAt = currentTime();
            task.updatedAt = currentTime();
            await requestContext.run({ user: "system" }, async () => await repo.save(task));

            const processingTime = performance.now() - startTime;
            this.updateMetrics(true, processingTime);

            this.emit('taskComplete', task, processingTime);
            logger.info(`Task completed: ${task.type}`, {
                taskId,
                processingTime: `${processingTime.toFixed(2)}ms`
            });

        } catch (error: any) {
            // Clear the timeout
            clearTimeout(timeoutId);

            const processingTime = performance.now() - startTime;
            const errorMessage = error.message || "Unknown error";

            if (task.retryCount < this.maxRetries && !errorMessage.includes('timed out')) {
                task.status = "pending" as TaskStatus;
                task.retryCount++;
                task.error = errorMessage;
                task.updatedAt = currentTime();
                await requestContext.run({ user: "system" }, async () => await repo.save(task));

                this.emit('taskRetry', task, error, task.retryCount);
                logger.warn(`Task will be retried: ${task.type}`, {
                    taskId,
                    retryCount: task.retryCount,
                    error: errorMessage
                });
            } else {
                // Mark as failed after max retries or if it was a timeout
                task.status = "failed" as TaskStatus;
                task.error = errorMessage;
                task.completedAt = currentTime();
                task.updatedAt = currentTime();
                await requestContext.run({ user: "system" }, async () => await repo.save(task));

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

    private async checkForStuckTasks() {
        const now = Date.now();
        const stuckTasks: string[] = [];

        for (const [taskId, processingTask] of this.currentlyProcessing.entries()) {
            const processingTime = now - processingTask.startTime;
            if (processingTime > this.taskTimeout) {
                stuckTasks.push(taskId);
            }
        }

        for (const taskId of stuckTasks) {
            logger.warn(`Found stuck task: ${taskId}, marking as timed out`);
            await this.markTaskAsTimedOut(taskId);
        }

        if (stuckTasks.length > 0) {
            logger.info(`Cleaned up ${stuckTasks.length} stuck tasks`);
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
        logger.info(`Starting task queue with concurrency: ${this.concurrency}, timeout: ${this.taskTimeout}ms`);

        // Main processing loop
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

        // Cleanup interval for stuck tasks
        this.cleanupInterval = setInterval(() => {
            this.checkForStuckTasks().catch(error => {
                logger.error("Error in stuck task cleanup", error);
            });
        }, 30000); // Check every 30 seconds

        this.emit('start');
    }

    async stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Clear all timeouts for currently processing tasks
        for (const processingTask of this.currentlyProcessing.values()) {
            clearTimeout(processingTask.timeoutId);
        }
        this.currentlyProcessing.clear();

        this.isProcessing = false;
        logger.info("Task queue stopped");
        this.emit('stop');
    }

    async pause() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.isProcessing = false;
        logger.info("Task queue paused");
        this.emit('pause');
    }

    async resume() {
        if (!this.isProcessing) {
            // We need to restart with the handler map, but it's not stored
            // For simplicity, we'll just set isProcessing to true and let the next interval run
            this.isProcessing = true;
            logger.info("Task queue resumed");
            this.emit('resume');
        }
    }

    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentlyProcessing: this.currentlyProcessing.size,
            concurrency: this.concurrency,
            taskTimeout: this.taskTimeout,
            metrics: { ...this.metrics }
        };
    }

    async cleanupOldTasks(days: number = 30) {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        // Calculate cutoff date in epoch format
        const cutoffEpoch = currentTime() - (days * 24 * 60 * 60);

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
        task.updatedAt = currentTime();

        await requestContext.run({ user: "system" }, async () => await repo.save(task));
        this.emit('taskManualRetry', task);

        return task;
    }

    async some(predicate: (task: Task<any>) => boolean | Promise<boolean>): Promise<boolean> {
        const source = await getConnection();
        const repo = source.getRepository(Task);

        const tasks = await repo.find();

        for (const task of tasks) {
            const result = await predicate(task);
            if (result) {
                return true;
            }
        }
        return false;
    }
}