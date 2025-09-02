'use server'

import { getConnection } from "@/data-source"
import { withAction } from "@/libs/withApi"
import { File, Folder } from "@/entity/File"
import { IsNull } from "typeorm"
import { currentTime, generateKey } from "@/libs/utils"
import { getCurrentToken, getUserByToken } from "./current-session"
import { addTaskQueue } from "@/server/taskQueue"

export type UserDriveSummary = {
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string;
    fileCount: number;
    folderCount: number;
    totalSize: number;
}

export const getDriveRoot = withAction<{}, { summaries: UserDriveSummary[] }>(async () => {
    const source = await getConnection();

    const summaries = await source.query(`
        SELECT 
            COALESCE(u.id, f."uId", 'unknown') AS "userId",
            COALESCE(u.name, 'Unknown User') AS "userName",
            COALESCE(u.email, '') AS "userEmail",
            COALESCE(u.meta->>'avatar', '') AS "userAvatar",
            COUNT(*) FILTER (WHERE f.type = 'file') AS "fileCount",
            COUNT(*) FILTER (WHERE f.type = 'folder') AS "folderCount",
            COALESCE(SUM((f.meta->>'size')), 0) AS "totalSize"
        FROM "users" u
        FULL OUTER JOIN "files" f
            ON u.id = f."uId"
        GROUP BY COALESCE(u.id, f."uId"), u.name, u.email, u.meta
        ORDER BY "userName";
    `);

    return {
        status: true,
        message: "Summary per user including unknown users",
        data: { summaries }
    };
});




export const getUserDriveSummary = withAction<{ uId: string }, UserDriveSummary & { mimeBreakdown: Record<string, number> }>(async ({ uId }) => {

    const source = await getConnection();

    // Main summary query
    const [summary] = await source.query(`
        SELECT 
            COALESCE(u.id, f."uId", 'unknown') AS "userId",
            COALESCE(u.name, 'Unknown User') AS "userName",
            COALESCE(u.email, '') AS "userEmail",
            COALESCE(u.meta->>'avatar', '') AS "userAvatar",
            COUNT(*) FILTER (WHERE f.type = 'file') AS "fileCount",
            COUNT(*) FILTER (WHERE f.type = 'folder') AS "folderCount",
            COALESCE(SUM(f.meta->>'size'), 0) AS "totalSize"
        FROM "users" u
        FULL OUTER JOIN "files" f
            ON u.id = f."uId"
        WHERE COALESCE(u.id, f."uId") = $1
        GROUP BY COALESCE(u.id, f."uId"), u.name, u.email, u.meta
    `, [uId]);

    if (!summary) throw new Error("User not found");

    // MIME type breakdown
    const mimeTypeRows = await source.query(`
        SELECT f.meta->>'mimeType' AS mimeType, COUNT(*) AS count
        FROM "files" f
        WHERE f."uId" = $1
          AND f.type = 'file'
        GROUP BY f.meta->>'mimeType'
    `, [uId]);

    const mimeArray: ({ count: number, mimeType: string })[] = mimeTypeRows.map((row: any) => ({
        mimeType: row.mimeType || 'unknown',
        count: Number(row.count)
    }));

    mimeArray.sort((a, b) => b.count - a.count);

    const top3 = mimeArray.slice(0, 4);
    const othersTotal = mimeArray.slice(4).reduce((sum, r) => sum + r.count, 0);
    if (othersTotal > 0) top3.push({ mimeType: 'Others', count: othersTotal });

    const mimeTypeCount: Record<string, number> = {};
    for (const item of top3) mimeTypeCount[item.mimeType] = item.count;

    return {
        status: true,
        message: "User drive summary",
        data: {
            ...summary,
            mimeBreakdown: mimeTypeCount
        }
    };
});



type DriveFilesProps = {
    uId: string;
    pId?: string;
    sortBy?: "type" | "name" | "createdAt" | "updatedAt" | "trashedAt";
    order?: "desc" | "asc";
    onlyType?: "folder" | "file";
}

export const getUserFiles = withAction<DriveFilesProps, { files: File[]; parent?: Folder }>(
    async ({ uId, pId, sortBy = "type", order = "asc", onlyType }) => {

        if (!uId) {
            throw new Error("400: userId tidak boleh kosong!");
        }
        if (!["asc", "desc"].includes(order)) {
            throw new Error("400: Order tidak valid!");
        }

        const source = await getConnection();
        const fileRepo = source.getRepository(File);

        // Fetch files under this folder
        const query = fileRepo.createQueryBuilder("f")
            .where("f.uId = :uId", { uId });

        if (onlyType) {
            query.andWhere("f.type = :onlyType", { onlyType });
        }

        if (pId) {
            query.andWhere("f.pId = :pId", { pId });
        } else {
            query.andWhere("f.pId IS NULL");
        }

        // 🔑 Sorting handler
        const allowedSort = {
            createdAt: "f.createdAt",
            updatedAt: "f.updatedAt",
            type: "f.type",
            name: "f.name",
            trashedAt: "f.meta ->> 'trashedAt'",
        } as const;

        const sortColumn = allowedSort[sortBy as keyof typeof allowedSort];
        if (sortColumn) {
            query.orderBy(sortColumn, order.toUpperCase() as | "ASC" | "DESC");
        } else {
            query.orderBy("file.updatedAt", "DESC");
        }

        const files = await query.getMany();

        // Fetch parent folder if pId exists
        let parent: Folder | null = null;
        if (pId) {
            parent = (await fileRepo.findOneBy({ id: pId })) as Folder;
        }

        return {
            status: true,
            message: "User files",
            data: {
                files: JSON.parse(JSON.stringify(files)),
                parent: parent ? JSON.parse(JSON.stringify(parent)) : null
            }
        };
    }
);



export const getUserFile = withAction<{ uId: string; id: string | null }, { file?: File }>(async ({ uId, id }) => {

    const source = await getConnection();
    const fileRepo = source.getRepository(File);
    const file = await fileRepo.findOneBy({
        uId,
        id: id ? id : IsNull()
    });
    if (!file) {
        throw new Error("404: File tidak ditemukan!");
    }
    return {
        status: true,
        message: "User file",
        data: {
            file: JSON.parse(JSON.stringify(file))
        }
    }
});



export const createUserFolder = withAction<{ uId?: string | null, name: string, pId: string | null }>(async ({ uId, name, pId }) => {

    let userId = uId;
    if (!userId) {
        const token = await getCurrentToken();
        const user = await getUserByToken(token);
        userId = user.id;
    }
    if (!userId) {
        throw new Error("400: userId tidak boleh kosong!");
    }
    if (name.length < 1 || name.length > 34) {
        throw new Error("400: Nama folder tidak boleh lebih kecil dari 1 dan lebih dari 34 karakter!");
    }
    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const file = fileRepository.create({
        id: generateKey(6),
        uId: userId,
        name,
        pId: pId ? pId : null,
        type: "folder",
        createdAt: currentTime(),
        meta: {
            itemCount: 0
        }
    });

    await fileRepository.save(file);
    const data = JSON.parse(JSON.stringify(file));

    const io = globalThis.ioServer;
    if (io) {
        io.emit("update", {
            collection: "file",
            columns: {
                id: file.id,
                pId: file.pId,
                uId: file.uId,
            },
            data
        });
    }

    return {
        status: true,
        message: "Ok",
        data
    }
});


type RenameProps = {
    userId: string;
    name: string;
    fileId: string;
}
export const renameUserFile = withAction<RenameProps>(async ({ userId, name, fileId }) => {

    const newName = name.trim()
    if (!userId) {
        throw new Error("400: userId tidak boleh kosong!");
    }
    if (newName.length < 1 || newName.length > 34) {
        throw new Error("400: Nama file tidak boleh lebih kecil dari 1 dan lebih dari 34 karakter!");
    }
    const source = await getConnection();
    const fileRepository = source.getRepository(File);

    const file = await fileRepository
        .findOneBy({
            id: fileId,
            uId: userId
        });
    if (!file) {
        throw new Error("404: File/Folder tidak ditemukan!");
    }

    const duplicate = await fileRepository
        .findOneBy({
            name: newName,
            pId: file.pId ? file.pId : IsNull(),
            uId: userId
        });

    if (duplicate) {
        throw new Error("400: Nama file diduplikasi dengan yang lain!");
    }


    file.name = newName;
    file.meta = {
        ...file.meta,
        updatedAt: currentTime()
    } as any;

    await fileRepository.save(file);

    const io = globalThis.ioServer;
    if (io) {
        io.emit("update", {
            collection: "file",
            columns: {
                id: file.id,
                uId: file.uId,
                pId: file.pId,
            }
        });
    }

    return {
        status: true,
        message: "Berhasil sunting nama file"
    }
})



type CopyMoveProps = {
    toUserId?: string;
    sourceId: string;
    targetId: string | null;
}
export const copyUserFile = withAction<CopyMoveProps>(async ({ toUserId, sourceId, targetId }) => {

    if (!sourceId) {
        throw new Error("400: Request tidak valid!");
    }
    if (sourceId == targetId) {
        throw new Error("401: Tidak dapat menyalin ke folder yang sama!");
    }

    const source = await getConnection();
    const fileRepository = source.getRepository(File);

    // helper: generate unique name in target folder
    const getUniqueName = async (baseName: string, parentId: string | null, toUserId: string) => {
        const siblings = await fileRepository.findBy({
            pId: parentId ? parentId : IsNull(),
            uId: toUserId
        });

        const siblingNames = new Set(siblings.map(s => s.name));
        if (!siblingNames.has(baseName)) return baseName;

        let counter = 1;
        let newName = `${baseName} (copy)`;
        while (siblingNames.has(newName)) {
            counter++;
            newName = `${baseName} (copy ${counter})`;
        }
        return newName;
    };

    const copiedItems = new Map<string, string>();
    const copyItem = async (fileId: string, newParentId: string | null, toUserId?: string | null) => {
        if (copiedItems.has(fileId)) {
            return copiedItems.get(fileId)!;
        }

        const original = await fileRepository.findOneBy({ id: fileId });
        if (!original) {
            throw new Error("404: File not found");
        }

        const copy = new File();
        Object.assign(copy, original);
        copy.id = generateKey(6);
        if (toUserId) {
            // if copy to another user
            copy.uId = toUserId;
        }
        copy.pId = newParentId;
        copy.name = await getUniqueName(original.name, newParentId, toUserId || copy.uId);
        copy.createdAt = Date.now();
        copy.updatedAt = null;
        copy.meta = { ...original.meta };

        await fileRepository.save(copy);
        copiedItems.set(fileId, copy.id);

        if (original.type === 'folder') {
            const children = await fileRepository.findBy({pId: original.id});

            await Promise.all(children.map(child =>
                copyItem(child.id, copy.id, toUserId)
            ));
        }

        return copy;
    };

    await copyItem(sourceId, targetId || null, toUserId);
})


export const moveUserFile = withAction<CopyMoveProps>(async ({ toUserId: uId, sourceId, targetId }) => {

    if (sourceId == targetId) {
        throw new Error("401: Tidak dapat memindah ke folder yang sama!");
    }
    if (!sourceId || !uId) {
        throw new Error("400: Request tidak valid!");
    }

    const source = await getConnection();
    const repository = source.getRepository(File);

    const file = await repository
        .findOneBy({
            id: sourceId,
            uId
        });

    if (!file) {
        throw new Error("404: File tidak ditemukan");
    }

    if (file.pId == targetId) {
        throw new Error("401: Tidak dapat memindah ke tempat yang sama!");
    }

    // Check if target folder exists
    if (targetId) {
        const targetFolder = await repository
            .findOneBy({ id: targetId, uId, type: 'folder' });
        if (!targetFolder) {
            throw new Error("404: Tujuan tidak ditemukan!");
        }
    }

    // helper: generate unique name in target folder
    const getUniqueName = async (baseName: string, parentId: string | null) => {
        const siblings = await repository.findBy({
            pId: parentId ? parentId : IsNull(),
            uId
        });

        const siblingNames = new Set(siblings.map(s => s.name));
        if (!siblingNames.has(baseName)) return baseName;

        let counter = 1;
        let newName = `${baseName} (copy)`;
        while (siblingNames.has(newName)) {
            counter++;
            newName = `${baseName} (copy ${counter})`;
        }
        return newName;
    };

    // Rename if duplicate in target folder
    file.name = await getUniqueName(file.name, targetId || null);

    const oldParent = file.pId;
    file.pId = targetId || null;
    file.updatedAt = currentTime();

    await repository.save(file);



    if (oldParent) {
        const parent = await repository
            .findOneBy({
                id: oldParent,
                type: "folder"
            });
        if (parent) {
            // @ts-ignore
            const itemCount = await repository
                .countBy({
                    pId: oldParent
                });
            parent.meta = { ...parent.meta, itemCount };

            await repository.save(parent);
        }
    }

    const io = globalThis.ioServer;
    if (io) {
        io.emit("update", {
            collection: "file",
            columns: {
                id: targetId,
                uId: uId,
                pId: file.pId,
            }
        });
    }

    return {
        status: true,
        message: "File moved successfully"
    };
});


type RemoveRestoreProps = {
    userId: string;
    fileId: string;
};

export const removeUserFile = withAction<RemoveRestoreProps & { permanen?: boolean }>(
    async ({ userId, fileId, permanen = false }) => {
        if (!fileId || !userId) {
            throw new Error("400: Request tidak valid!");
        }

        const source = await getConnection();
        const repository = source.getRepository(File);

        const file = await repository.findOneBy({
            id: fileId,
            uId: userId
        });

        if (!file) {
            throw new Error("404: File tidak ditemukan!");
        }

        // recursive finder for children
        const findChildrenRecursive = async (parentId: string): Promise<File[]> => {
            const children = await repository.findBy({
                pId: parentId,
                uId: userId
            });

            const all: File[] = [...children];
            for (const child of children) {
                if (child.type === "folder") {
                    const subChildren = await findChildrenRecursive(child.id);
                    all.push(...subChildren);
                }
            }
            return all;
        };

        if (permanen) {
            // if folder → get all children first
            let filesToDelete: File[] = [file];
            if (file.type === "folder") {
                const children = await findChildrenRecursive(file.id);
                filesToDelete.push(...children);
            }

            // remove S3 objects for files with meta.Key
            for (const f of filesToDelete) {
                // @ts-ignore
                if (f.meta?.Key) {
                    // @ts-ignore
                    addTaskQueue("delete-file", { objectKey: f.meta.Key });
                }
            }

            // delete all from DB
            await repository.delete(filesToDelete.map(f => f.id));
        } else {
            // soft delete (move to trash)
            file.meta = {
                ...(file.meta || {}),
                trashed: true,
                trashedAt: currentTime()
            };
            await repository.save(file);
        }

        const io = globalThis.ioServer;
        if (io) {
            io.emit("update", {
                collection: "file",
                columns: {
                    id: file.id,
                    uId: file.uId,
                    pId: file.pId
                }
            });
        }

        return {
            status: true,
            message: permanen ? "File permanently deleted" : "File moved to trash"
        };
    }
);


export const restoreUserFile = withAction<RemoveRestoreProps>(async ({ userId, fileId }) => {

    if (!fileId || !userId) {
        throw new Error("400: Request tidak valid!");
    }

    const source = await getConnection();
    const repository = source.getRepository(File);

    const file = await repository.findOneBy({
        id: fileId,
        uId: userId
    });

    if (!file) {
        throw new Error("404: File tidak ditemukan!");
    }


    file.meta = {
        ...(file.meta || {}),
        trashed: false,
        trashedAt: null
    } as any;

    delete (file.meta as any).trashed;
    delete (file.meta as any).trashedAt;

    await repository.save(file);

    const io = globalThis.ioServer;
    if (io) {
        io.emit("update", {
            collection: "file",
            columns: {
                id: file.id,
                uId: file.uId,
                pId: file.pId,
            }
        });
    }

    return {
        status: true,
        message: "File restored from trash"
    }
});


type ShareProps = {
    fileId: string;
    userId: string;
    generalPermit: string;
}
export const shareUserFile = withAction<ShareProps>(
    async ({ fileId, userId, generalPermit }) => {

        const source = await getConnection();
        const repository = source.getRepository(File);

        const file = await repository.findOneBy({
            id: fileId,
            uId: userId
        });

        if (!file) {
            throw new Error("404: File tidak ditemukan!");
        }

        file.meta = {
            ...file.meta,
            generalPermit
        } as any;
        file.updatedAt = currentTime();

        await repository.save(file);
        // const io = globalThis.ioServer;
        // if (io) {
        //     io.emit("update", {
        //         collection: "file",
        //         columns: {
        //             id: file.id,
        //             uId: file.uId,
        //             pId: file.pId,
        //         }
        //     });
        // }

        return {
            status: true,
            message: "Ok"
        }
    }
)