import { getConnection } from "@/data-source";
import { createFunction } from "../funcHelper";
import { addTaskQueue } from "../taskQueue";
import { Task } from "@/entities/Task";
import { In } from "typeorm";
import { checkPermission } from "../checkPermission";

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