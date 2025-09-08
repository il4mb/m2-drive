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

export const createFolder = createFunction(async ({ userId, name, pId }: CreateFolderProps) => {

    const { user: actor } = getRequestContext();
    if (!actor) throw new Error("401: Unauthenticated");

    if (!userId) {
        throw new Error("Failed Create Folder: userId tidak boleh kosong!");
    }

    if (actor != "system" && actor?.meta.role != "admin" && actor?.id != userId) {
        throw new Error("Failed Create Folder: Not allowed to performs this action");
    }

    if (name.length < 1 || name.length > 34) {
        throw new Error("Failed Create Folder: Nama folder tidak boleh lebih kecil dari 1 dan lebih dari 34 karakter!");
    }


    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const nameExist = await fileRepository.findOneBy({
        pId: pId ? pId : IsNull(),
        name,
        uId: userId
    });

    if (nameExist) {
        throw new Error("Failed Create Folder: Folder dengan nama yang sama sudah ada!");
    }

    if (pId) {
        const folder = await fileRepository.findOneBy({ id: pId });
        if (!folder) {
            throw new Error("Failed Create Folder: Folder tujuan tidak ditemukan!");
        }
        const tags = folder.meta?.tags || [];
        if (tags.some(tag => ['no-append', 'no-edit'].includes(tag))) {
            throw new Error("Failed Create Folder: Menambah folder tidak diperbolehkan!");
        }
    }

    const file = fileRepository.create({
        id: generateKey(8),
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
})

export type UpdateFilePart = Partial<Omit<File, "meta">> & {
    meta?: Partial<NonNullable<File["meta"]>>;
};


type UpdateFileProps = {
    id: string;
    data: UpdateFilePart;
};

export const updateFile = createFunction(async ({ id, data }: UpdateFileProps) => {
    
    const { user: actor } = getRequestContext();
    if (!actor) throw new Error("Failed Update File: Unauthenticated");

    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const file = await fileRepository.findOneBy({ id });
    if (!file) throw new Error("Failed Update File: File not found");

    const isSystem = actor == "system";
    const isAdmin = !isSystem && actor?.meta.role === "admin";
    const isOwner = !isSystem && actor?.id === file.uId;

    // Check permissions
    if (!isSystem && !isAdmin && !isOwner) {
        throw new Error("Failed Update File: Not allowed to perform this action");
    }

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
    const allowedMetaFields = file.type === "folder" ? folderMetaFields : fileMetaFields;

    // If user is admin, only allow updating tags in meta
    if (isAdmin && !isOwner) {
        // Check if admin is trying to update anything other than meta.tags
        const hasNonMetaUpdates = Object.keys(data).some(key => key !== "meta");
        const hasNonTagMetaUpdates = data.meta ? Object.keys(data.meta).some(key => key !== "tags") : false;

        if (hasNonMetaUpdates || hasNonTagMetaUpdates) {
            throw new Error("Failed Update File: Admin can only update tags for files they don't own");
        }
    }

    // Check for unknown top-level keys for regular users
    if (!isAdmin || isOwner) {
        for (const key of Object.keys(data)) {
            if (key !== "meta" && !allowedFields.includes(key as keyof File)) {
                throw new Error(`Failed Update File: Unknown property "${key}" in update`);
            }
        }
    }

    // Apply top-level allowed fields (only for owners or admin on their own files)
    if (isOwner || (isAdmin && isOwner)) {
        for (const key of allowedFields) {
            if (key in data && key !== "meta") {
                (file as any)[key] = data[key as keyof UpdateFilePart] as any;
            }
        }
    }

    // Merge and validate meta
    if (data.meta) {
        // For admin on non-owned files, only allow tags
        if (isAdmin && !isOwner) {
            const metaKeys = Object.keys(data.meta);
            if (metaKeys.length !== 1 || !metaKeys.includes("tags")) {
                throw new Error("Failed Update File: Admin can only update tags for files they don't own");
            }
        }

        // For regular users or admin on their own files, validate all meta fields
        if (isOwner || (isAdmin && isOwner)) {
            for (const key of Object.keys(data.meta)) {
                if (!allowedMetaFields.includes(key as keyof File["meta"])) {
                    throw new Error(
                        `Failed Update File: Unknown meta property "${key}" in update`
                    );
                }
            }
        }

        const currentMeta = file.meta || {};
        const newMeta = JSON.parse(JSON.stringify(currentMeta));

        // Apply meta updates based on permissions
        for (const key of allowedMetaFields) {
            if (key in data.meta) {
                // For admin on non-owned files, only apply tags
                if (isAdmin && !isOwner && key !== "tags") {
                    continue;
                }
                // @ts-ignore
                (newMeta as any)[key] = data.meta[key];
            }
        }

        file.meta = newMeta;
    }

    const tags = file.meta?.tags || [];
    const isOnlyUpdatingTags =
        data.meta &&
        Object.keys(data.meta).length === 1 &&
        Object.prototype.hasOwnProperty.call(data.meta, "tags");

    // Check for "no-edit" tag restriction (applies to everyone except maybe super admins)
    if (tags.some(tag => tag === "no-edit") && !isOnlyUpdatingTags) {
        throw new Error("Failed Update File: Mengedit file/folder tidak diperbolehkan!");
    }

    file.updatedAt = currentTime();
    await fileRepository.save(file);
    return file;
})