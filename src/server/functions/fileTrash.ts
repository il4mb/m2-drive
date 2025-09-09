'use server'

import { getConnection } from "@/data-source"
import { File } from "@/entities/File";
import { currentTime } from "@/libs/utils";
import { createFunction, writeActivity } from "../funcHelper";
import { Brackets } from "typeorm";
import Contributor from "@/entities/Contributor";
import { getRequestContext } from "@/libs/requestContext";
import { addTaskQueue } from "@/server/taskQueue";
import { checkPermission, checkPermissionSilent } from "../checkPermission";


type RemoveRestoreProps = {
    fileId: string;
};
export const removeFile = createFunction(
    async ({ fileId, permanen = false }: RemoveRestoreProps & { permanen?: boolean }) => {
        if (!fileId) {
            throw new Error("400: Request tidak valid!");
        }

        const { user: actor } = getRequestContext();
        const isRoot = await checkPermission(actor, 'can-manage-drive-root');
        if (!isRoot) {
            checkPermission(actor, 'can-delete-file');
        }
        const source = await getConnection();
        const repository = source.getRepository(File);
        const contributorRepository = source.getRepository(Contributor);

        const file = await repository.findOneBy({ id: fileId });
        if (!file) {
            throw new Error("404: File tidak ditemukan!");
        }

        const tags = file.meta?.tags || [];
        if (tags.some(tag => ['no-remove', 'no-edit'].includes(tag))) {
            throw new Error("403: Menghapus tidak diperbolehkan!");
        }

        if (!isRoot && actor != "system" && actor?.meta.role != "admin" && actor?.id != file.uId) {
            throw new Error("403: Not allowed to delete this " + file.type);
        }

        // recursive finder for children
        const findChildrenRecursive = async (parentId: string): Promise<File[]> => {
            const children = await repository.findBy({ pId: parentId });

            const all: File[] = [...children];
            for (const child of children) {
                if (child.type === "folder") {
                    const subChildren = await findChildrenRecursive(child.id);
                    all.push(...subChildren);
                }
            }
            return all;
        };

        let filesToProcess: File[] = [file];
        if (file.type === "folder") {
            const children = await findChildrenRecursive(file.id);
            filesToProcess.push(...children);
        }

        // Separate files into same-owner and different-owner groups
        const sameOwnerFiles = filesToProcess.filter(f => f.uId === file.uId);
        const diffOwnerFiles = filesToProcess.filter(f => f.uId !== file.uId);

        // For different owner → detach from parent
        if (diffOwnerFiles.length) {
            for (const child of diffOwnerFiles) {
                child.pId = null;
                child.updatedAt = currentTime();
            }
            await repository.save(diffOwnerFiles);
        }

        if (permanen) {
            for (const f of sameOwnerFiles) {
                // @ts-ignore
                const key = f.meta?.Key;
                if (key) {
                    const ussageCount = await repository.createQueryBuilder('f')
                        .where('f.meta->>\'Key\' = :key', { key })
                        .getCount()

                    console.log(ussageCount)

                    if (ussageCount <= 1) {
                        // @ts-ignore
                        addTaskQueue("delete-file", { objectKey: key });
                    }
                }
            }

            await repository.delete(sameOwnerFiles.map(f => f.id));
        } else {
            // Mark ALL same-owner files as trashed
            const updatedFiles = sameOwnerFiles.map(f => ({
                ...f,
                meta: {
                    ...(f.meta || {}),
                    trashed: true,
                    trashedAt: currentTime()
                }
            }));

            const removeContributor = updatedFiles.map(async (f) => {
                await contributorRepository.delete({ fileId: f.id });
            });

            await repository.save(updatedFiles);
            await Promise.all(removeContributor);
        }
    }
);


export const restoreFile = createFunction(async ({ fileId }: RemoveRestoreProps) => {
    // Validate input
    if (!fileId?.trim()) {
        throw new Error("400: Request tidak valid!");
    }


    const { user: actor } = getRequestContext();
    const isRoot = await checkPermissionSilent(actor, "can-manage-drive-root");
    const source = await getConnection();
    const repository = source.getRepository(File);

    // Find the file with proper error handling
    const file = await repository.findOneBy({ id: fileId });

    if (!file) {
        throw new Error("404: File tidak ditemukan!");
    }

    if (!isRoot && actor != "system" && actor?.meta.role != "admin" && actor?.id != file.uId) {
        throw new Error("403: Not allowed to restore this " + file.type);
    }

    // Check if parent exists and is not trashed
    if (file.pId) {
        const parent = await repository.createQueryBuilder("f")
            .where("f.id = :id", { id: file.pId })
            .andWhere(new Brackets((q) => {
                q.where("f.meta->>'trashed' IS NULL")
                    .orWhere("f.meta->>'trashed' = false");
            }))
            .getOne();

        if (!parent) {
            file.pId = null;
        }
    }

    // @ts-ignore
    const { trashed, trashedAt, ...cleanMeta } = file.meta || {};
    file.meta = cleanMeta;

    await repository.save(file);

    writeActivity("DELETE_FILE", `Menghapus ${file.type} ${file.name}`);
});


type EmptyTrashProps = {
    userId: string;
};

export const emptyTrash = createFunction(async ({ userId }: EmptyTrashProps) => {

    if (!userId?.trim()) {
        throw new Error("400: Request tidak valid!");
    }

    const { user: actor } = getRequestContext();
    const isRoot = await checkPermission(actor, "can-manage-drive-root");
    const source = await getConnection();
    const repository = source.getRepository(File);

    if (!isRoot && actor != "system" && actor?.meta.role != "admin" && actor?.id != userId) {
        throw new Error("403: Not allowed to performs this action");
    }

    // Find all trashed files for this user
    const trashedFiles = await repository
        .createQueryBuilder("f")
        .where("f.uId = :userId", { userId })
        .andWhere(new Brackets((q) => {
            q.where("f.meta->>'trashed' = true");
        }))
        .getMany();

    if (!trashedFiles.length) {
        return; // nothing to delete
    }

    // If they have S3 keys, queue them for deletion
    for (const f of trashedFiles) {
        if (!isRoot && actor != "system" && actor?.meta.role != "admin" && actor?.id != f.uId) {
            throw new Error("403: Not allowed to performs this action");
        }

        // @ts-ignore
        if (f.meta?.Key) {
            // @ts-ignore
            addTaskQueue("delete-file", { objectKey: f.meta.Key });
        }
    }

    // Permanently remove them from the DB
    await repository.delete(trashedFiles.map(f => f.id));

    writeActivity("DELETE_FILE", `Menghapus banyak file/folder jumlah ${trashedFiles.length || 0}`);

});
