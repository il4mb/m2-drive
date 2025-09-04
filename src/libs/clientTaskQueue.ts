"use client";

type TaskPayload = {
    [key: string]: any
}

type TaskEntry<T extends TaskPayload | null> = {
    id: string;
    task: (payload: T, id: string, signal: AbortSignal) => Promise<unknown>;
    payload: T;
    controller: AbortController;
    startPromise?: { resolve: () => void; reject: (reason?: any) => void };
}

export class ClientTaskQueue<T extends TaskPayload | null = any> {
    private queue: TaskEntry<T>[] = [];
    private running = new Map<string, AbortController>();
    private activeCount = 0;

    constructor(private concurrency: number = 1) { }

    add(id: string, payload: T, task: (payload: T, id: string, signal: AbortSignal) => Promise<unknown>) {
        if (this.running.has(id) || this.queue.find((t) => t.id === id)) {
            console.warn(`Task "${id}" already exists.`);
            return;
        }

        const controller = new AbortController();
        this.queue.push({ id, task, payload, controller });
        this.run();
    }

    private async run() {
        while (this.queue.length && this.activeCount < this.concurrency) {
            const taskEntry = this.queue.shift()!;
            const { id, task, payload, controller, startPromise } = taskEntry;
            
            this.running.set(id, controller);
            this.activeCount++;

            // Resolve the start promise if it exists
            if (startPromise) {
                startPromise.resolve();
            }

            try {
                await task(payload, id, controller.signal);
            } catch (err) {
                if (controller.signal.aborted) {
                    console.log(`Task "${id}" aborted.`);
                } else {
                    console.error(`Task "${id}" failed:`, err);
                }
            } finally {
                this.running.delete(id);
                this.activeCount--;
                this.run();
            }
        }
    }

    start(id: string) {
        // If task is already running, do nothing
        if (this.running.has(id)) {
            return;
        }

        // Find the task in the queue
        const taskIndex = this.queue.findIndex((t) => t.id === id);
        if (taskIndex === -1) {
            console.warn(`Task "${id}" not found in queue.`);
            return;
        }

        // If we're at concurrency limit, abort the oldest running task
        if (this.activeCount >= this.concurrency) {
            // Get the first running task and abort it
            const firstRunningId = Array.from(this.running.keys())[0];
            if (firstRunningId) {
                this.abort(firstRunningId);
            }
        }

        // Move the task to the front of the queue
        const [task] = this.queue.splice(taskIndex, 1);
        this.queue.unshift(task);

        // Run the queue
        this.run();
    }

    startUntilRun(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // If task is already running, resolve immediately
            if (this.running.has(id)) {
                resolve();
                return;
            }

            // Find the task in the queue
            const taskIndex = this.queue.findIndex((t) => t.id === id);
            if (taskIndex === -1) {
                reject(new Error(`Task "${id}" not found in queue.`));
                return;
            }

            // Add start promise to the task entry
            this.queue[taskIndex].startPromise = { resolve, reject };

            // If we're at concurrency limit, abort the oldest running task
            if (this.activeCount >= this.concurrency) {
                // Get the first running task and abort it
                const firstRunningId = Array.from(this.running.keys())[0];
                if (firstRunningId) {
                    this.abort(firstRunningId);
                }
            }

            // Move the task to the front of the queue
            const [task] = this.queue.splice(taskIndex, 1);
            this.queue.unshift(task);

            // Run the queue
            this.run();
        });
    }

    abort(id: string) {
        // Abort running task
        const controller = this.running.get(id);
        if (controller) {
            controller.abort();
            this.running.delete(id);
            this.activeCount--;
            return;
        }

        // Remove from queue if not started
        const index = this.queue.findIndex((t) => t.id === id);
        if (index !== -1) {
            // Reject the start promise if it exists
            if (this.queue[index].startPromise) {
                this.queue[index].startPromise!.reject(new Error(`Task "${id}" aborted before starting.`));
            }
            
            this.queue[index].controller.abort();
            this.queue.splice(index, 1);
        }
    }

    has(id: string) {
        return this.running.has(id) || this.queue.some((t) => t.id === id);
    }

    clear() {
        // Abort all queued tasks and reject their start promises
        this.queue.forEach((t) => {
            if (t.startPromise) {
                t.startPromise.reject(new Error("Queue cleared before task could start."));
            }
            t.controller.abort();
        });
        this.queue = [];

        // Abort all running tasks
        this.running.forEach((controller) => controller.abort());
        this.running.clear();

        this.activeCount = 0;
    }

    isIdle(): boolean {
        return this.queue.length === 0 && this.running.size === 0;
    }

    // Optional: Get current queue status for debugging
    getStatus() {
        return {
            queue: this.queue.map(t => t.id),
            running: Array.from(this.running.keys()),
            activeCount: this.activeCount,
            concurrency: this.concurrency
        };
    }
}