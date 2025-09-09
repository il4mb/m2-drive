'use server'

import { Task } from "@/entities/Task";
import { createFunction } from "../funcHelper"
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission } from "../checkPermission";
import { getConnection } from "@/data-source";
import { In } from "typeorm";

type UpdateTask = {
    taskId: string;
    data: Partial<Task>
}

export const updateTask = createFunction(async ({ taskId, data }: UpdateTask) => {
    const { user: actor } = getRequestContext();

    // Permission check
    await checkPermission(actor, "can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);

    const task = await taskRepository.findOneBy({ id: taskId });
    if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
    }

    // Merge and save
    Object.assign(task, data);
    await taskRepository.save(task);

    return task;
});



export const deleteTask = createFunction(async ({ taskId }: { taskId: string }) => {
    const { user: actor } = getRequestContext();

    // Permission check
    await checkPermission(actor, "can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);

    const task = await taskRepository.findOneBy({ id: taskId });
    if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
    }

    await taskRepository.remove(task);

    return { deletedId: taskId };
});


export const bulkDeleteTask = createFunction(async ({ tasksId }: { tasksId: string[] }) => {

    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-manage-task-queue");

    const connection = await getConnection();
    const taskRepository = connection.getRepository(Task);
    const result = await taskRepository.delete({ id: In(tasksId) });

    return {
        deletedIds: tasksId,
        affected: result.affected ?? 0
    };
});