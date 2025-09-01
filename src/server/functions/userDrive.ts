'use server'

import { getConnection } from "@/data-source"
import { File } from "@/entity/File";
import { getRequestContext } from "@/libs/requestContext";
import { currentTime, generateKey } from "@/libs/utils";
import { createFunction } from "../funcHelper";
import { IsNull } from "typeorm";


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
    }
);
