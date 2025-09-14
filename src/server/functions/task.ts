'use server'

import { Task } from "@/entities/Task";
import { createFunction, writeActivity } from "../funcHelper"
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission } from "../checkPermission";
import { getConnection } from "@/data-source";
import { In } from "typeorm";
import { currentTime, DATE_EPOCH } from "@/libs/utils";
import { addTaskQueue } from "../taskQueue";

type UpdateTask = {
    taskId: string;
    data: Partial<Task>
}

export const updateTask = createFunction(async ({ taskId, data }: UpdateTask) => {

    // Permission check
    await checkPermission("can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);

    const task = await taskRepository.findOneBy({ id: taskId });
    if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
    }

    // Merge and save
    Object.assign(task, data);
    await taskRepository.save(task);

    if (data.status == "pending") {
        writeActivity("RESTART_TASK", `Memulai ulang task ${task.id}`);
    } else {
        writeActivity("EDIT_TASK", `Memperbarui task ${task.id}`);
    }

    return task;
});



export const deleteTask = createFunction(async ({ taskId }: { taskId: string }) => {

    // Permission check
    await checkPermission("can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);

    const task = await taskRepository.findOneBy({ id: taskId });
    if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
    }

    await taskRepository.remove(task);

    writeActivity("DELETE_TASK", `Menghapus task ${task.id}`);

    return { deletedId: taskId };
});


export const bulkDeleteTask = createFunction(async ({ tasksId }: { tasksId: string[] }) => {

    await checkPermission("can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const result = await taskRepository.delete({ id: In(tasksId) });

    writeActivity("DELETE_TASK", `Menghapus banyak task dengan jumlah ${result.affected ?? 0}`);

    return {
        deletedIds: tasksId,
        affected: result.affected ?? 0
    };
});




export const cleanUpTask = createFunction(async () => {
    await checkPermission("can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const exist = await taskRepository.findOneBy({ type: "clean-task", status: In(["pending", "processing"]) });
    if (exist) throw new Error("Task sudah ada mohon, mohon coba kembali setelah task selesai!");

    addTaskQueue("clean-task", {});
    writeActivity("START_CLEAN_TASK", "Memulai membersihkan task");
})


export const getTaskHourlySummary = createFunction(async () => {
    const connection = await getConnection();
    const repo = connection.getRepository(Task);

    const stats = await repo
        .createQueryBuilder("a")
        .select([
            `strftime('%H', datetime(a.createdAt + ${DATE_EPOCH}, 'unixepoch', 'localtime')) AS hour`,
            `COUNT(*) AS total`,
            `AVG(CASE WHEN a.completedAt IS NOT NULL AND a.startedAt IS NOT NULL 
                      THEN (a.completedAt - a.startedAt) END) AS avgExecTime`
        ])
        .groupBy("hour")
        .orderBy("hour", "ASC")
        .where("createdAt > :aDayAgo", { aDayAgo: currentTime("-24h") })
        .getRawMany();

    return stats.map(s => ({
        hour: s.hour,
        total: Number(s.total),
        avgExecTime: s.avgExecTime ? Number(s.avgExecTime) : null // ms
    }));
});
