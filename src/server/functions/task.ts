'use server'

import { Task } from "@/entities/Task";
import { createFunction, writeActivity } from "../funcHelper"
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission } from "../checkPermission";
import { getConnection } from "@/data-source";
import { In } from "typeorm";

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

    const { user: actor } = getRequestContext();
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