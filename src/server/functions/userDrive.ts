'use server'

import { getConnection } from "@/data-source"
import { File } from "@/entity/File";
import { getRequestContext } from "@/libs/requestContext";
import { currentTime, generateKey } from "@/libs/utils";
import { createFunction } from "../funcHelper";
import { Brackets, IsNull, JsonContains } from "typeorm";
import Contributor from "@/entity/Contributor";


type CreateFolderProps = {
    userId: string,
    name: string,
    pId: string | null
}

export const createFolder = createFunction<CreateFolderProps>(async ({ userId, name, pId }) => {

    if (!userId) {
        throw new Error("400: userId tidak boleh kosong!");
    }
    if (name.length < 1 || name.length > 34) {
        throw new Error("400: Nama folder tidak boleh lebih kecil dari 1 dan lebih dari 34 karakter!");
    }
    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const nameExist = await fileRepository.findOneBy({
        pId: pId ? pId : IsNull(),
        name,
        uId: userId
    });

    if (nameExist) {
        throw new Error("400: Folder dengan nama yang sama sudah ada!");
    }

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
})

export type UpdateFilePart = Partial<Omit<File, "meta">> & {
    meta?: Partial<NonNullable<File["meta"]>>;
};

type UpdateFileProps = {
    id: string;
    data: UpdateFilePart;
};

export const updateFile = async ({ id, data }: UpdateFileProps) => {
    const { user } = getRequestContext();
    const uId = user?.id;
    if (!uId) throw new Error("401: Unauthenticated");

    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const file = await fileRepository.findOneBy({ uId, id });
    if (!file) throw new Error("404: File not found");

    const allowedFields: (keyof File)[] = ["name", "pId", "type", "updatedAt"];
    const folderMetaFields = [
        "itemCount",
        "description",
        "shared",
        "tags",
        "lastOpened",
        "color",
        "starred",
        "generalPermit"
    ];
    const fileMetaFields = [
        "size",
        "mimeType",
        "description",
        "starred",
        "trashed",
        "trashedAt",
        "shared",
        "generalPermit",
        "thumbnail",
        "tags",
        "lastOpened",
        "Key"
    ];
    const allowedMetaFields =
        file.type === "folder" ? folderMetaFields : fileMetaFields;

    // Check for unknown top-level keys
    for (const key of Object.keys(data)) {
        if (key !== "meta" && !allowedFields.includes(key as keyof File)) {
            throw new Error(`400: Unknown property "${key}" in update`);
        }
    }

    // Apply top-level allowed fields
    for (const key of allowedFields) {
        if (key in data && key !== "meta") {
            (file as any)[key] = data[key as keyof UpdateFilePart] as any;
        }
    }

    // Merge and validate meta
    if (data.meta) {
        for (const key of Object.keys(data.meta)) {
            if (!allowedMetaFields.includes(key as keyof File["meta"])) {
                throw new Error(
                    `400: Unknown meta property "${key}" in update`
                );
            }
        }

        const currentMeta = file.meta || {};
        const newMeta = JSON.parse(JSON.stringify(currentMeta));

        for (const key of allowedMetaFields) {
            if (key in data.meta) {
                // @ts-ignore
                (newMeta as any)[key] = data.meta[key];
            }
        }

        file.meta = newMeta;
    }

    file.updatedAt = currentTime();
    await fileRepository.save(file);
    return file;
}




type CopyMoveProps = {
    userId: string;
    sourceId: string;
    targetId: string | null;
}
export const copyFile = createFunction<CopyMoveProps>(async ({ userId, sourceId, targetId }) => {

    if (!sourceId || !userId) {
        throw new Error("400: Request tidak valid!");
    }
    if (sourceId == targetId) {
        throw new Error("401: Tidak dapat menyalin ke folder yang sama!");
    }

    const source = await getConnection();
    const fileRepository = source.getRepository(File);

    // helper: generate unique name in target folder
    const getUniqueName = async (baseName: string, parentId: string | null) => {
        const siblings = await fileRepository.findBy({
            pId: parentId ? parentId : IsNull(),
            uId: userId
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
    const copyItem = async (fileId: string, newParentId: string | null, uId: string) => {
        if (copiedItems.has(fileId)) {
            return copiedItems.get(fileId)!;
        }

        const original = await fileRepository.findOneBy({
            id: fileId,
            uId
        });
        if (!original) {
            throw new Error("404: File not found");
        }

        const copy = new File();
        Object.assign(copy, original);
        copy.id = generateKey(6);
        copy.uId = uId;
        copy.pId = newParentId;
        copy.name = await getUniqueName(original.name, newParentId);
        copy.createdAt = Date.now();
        copy.updatedAt = null;
        copy.meta = { ...original.meta };

        await fileRepository.save(copy);
        copiedItems.set(fileId, copy.id);

        if (original.type === 'folder') {
            const children = await fileRepository.findBy({
                pId: original.id,
                uId
            });

            await Promise.all(children.map(child =>
                copyItem(child.id, copy.id, uId)
            ));
        }

        return copy;
    };

    await copyItem(sourceId, targetId || null, userId);

});


export const moveFile = createFunction<CopyMoveProps>(async ({ userId, sourceId, targetId }) => {

    if (sourceId == targetId) {
        throw new Error("401: Tidak dapat memindah ke folder yang sama!");
    }
    if (!sourceId || !userId) {
        throw new Error("400: Request tidak valid!");
    }

    const source = await getConnection();
    const repository = source.getRepository(File);

    const file = await repository
        .findOneBy({
            id: sourceId,
            uId: userId
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
            .findOneBy({ id: targetId, uId: userId, type: 'folder' });
        if (!targetFolder) {
            throw new Error("404: Tujuan tidak ditemukan!");
        }
    }

    // helper: generate unique name in target folder
    const getUniqueName = async (baseName: string, parentId: string | null) => {
        const siblings = await repository.findBy({
            pId: parentId ? parentId : IsNull(),
            uId: userId
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

    return {
        status: true,
        message: "File moved successfully"
    };
});




type RemoveRestoreProps = {
    userId: string;
    fileId: string;
};
export const removeFile = createFunction<RemoveRestoreProps & { permanen?: boolean }>(
    async ({ userId, fileId, permanen = false }) => {
        if (!fileId || !userId) {
            throw new Error("400: Request tidak valid!");
        }

        const source = await getConnection();
        const repository = source.getRepository(File);
        const contributorRepository = source.getRepository(Contributor);

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


        let filesToDelete: File[] = [file];
        if (file.type === "folder") {
            const children = await findChildrenRecursive(file.id);
            filesToDelete.push(...children);
        }

        if (permanen) {
            for (const f of filesToDelete) {
                // @ts-ignore
                if (f.meta?.Key) {
                    // @ts-ignore
                    addTaskQueue("delete-file", { objectKey: f.meta.Key });
                }
            }
            await repository.delete(filesToDelete.map(f => f.id));
        } else {
            // Mark ALL files as trashed
            const updatedFiles = filesToDelete.map(f => ({
                ...f,
                meta: {
                    ...(f.meta || {}),
                    trashed: true,
                    trashedAt: currentTime()
                }
            }));
            const removeContributor = updatedFiles.map(async (f) => {
                await contributorRepository.delete({ fileId: f.id })
            })

            await repository.save(updatedFiles);
            await Promise.all(removeContributor);

        }
    }
);

export const restoreFile = createFunction<RemoveRestoreProps>(async ({ userId, fileId }) => {
    // Validate input
    if (!fileId?.trim() || !userId?.trim()) {
        throw new Error("400: Request tidak valid!");
    }

    const source = await getConnection();
    const repository = source.getRepository(File);

    // Find the file with proper error handling
    const file = await repository.findOneBy({
        id: fileId,
        uId: userId
    });

    if (!file) {
        throw new Error("404: File tidak ditemukan!");
    }

    // Check if parent exists and is not trashed
    if (file.pId) {
        const parent = await repository.createQueryBuilder("f")
            .where("f.id = :id", { id: file.pId })
            .andWhere("f.uId = :userId", { userId })
            .andWhere(new Brackets((q) => {
                q.where("f.meta->>'trashed' IS NULL")
                    .orWhere("f.meta->>'trashed' = false");
            }))
            .getOne();

        // If parent doesn't exist or is trashed, detach from parent
        if (!parent) {
            file.pId = null;
        }
    }

    // Restore the file by removing trash properties
    // @ts-ignore
    const { trashed, trashedAt, ...cleanMeta } = file.meta || {};
    file.meta = cleanMeta;

    await repository.save(file);
});


type EmptyTrashProps = {
    userId: string;
};

export const emptyTrash = createFunction<EmptyTrashProps>(async ({ userId }) => {
    if (!userId?.trim()) {
        throw new Error("400: Request tidak valid!");
    }

    const source = await getConnection();
    const repository = source.getRepository(File);

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
        // @ts-ignore
        if (f.meta?.Key) {
            // @ts-ignore
            addTaskQueue("delete-file", { objectKey: f.meta.Key });
        }
    }

    // Permanently remove them from the DB
    await repository.delete(trashedFiles.map(f => f.id));
});
