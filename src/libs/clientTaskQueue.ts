"use client";

type TaskPayload = {
    [key: string]: any
}

type TaskEntry<T extends TaskPayload | null> = {
    id: string;
    task: (payload: T, id: string, signal: AbortSignal) => Promise<unknown>;
    payload: T;
    controller: AbortController;
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
            const { id, task, payload, controller } = this.queue.shift()!;
            this.running.set(id, controller);
            this.activeCount++;

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

    abort(id: string) {
        // Abort running task
        const controller = this.running.get(id);
        if (controller) {
            controller.abort();
            return;
        }

        // Remove from queue if not started
        const index = this.queue.findIndex((t) => t.id === id);
        if (index !== -1) {
            this.queue[index].controller.abort();
            this.queue.splice(index, 1);
        }
    }

    has(id: string) {
        return this.running.has(id) || this.queue.some((t) => t.id === id);
    }

    clear() {
        // Abort all queued tasks
        this.queue.forEach((t) => t.controller.abort());
        this.queue = [];

        // Abort all running tasks
        this.running.forEach((controller) => controller.abort());
        this.running.clear();

        this.activeCount = 0;
    }

    isIdle(): boolean {
        return this.queue.length === 0 && this.running.size === 0;
    }
}
