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

    const { user: actor } = getRequestContext();
    if (!actor) throw new Error("401: Unauthenticated");

    if (!userId) {
        throw new Error("400: userId tidak boleh kosong!");
    }

    if (actor?.meta.role != "admin" && actor?.id != userId) {
        throw new Error("403: Not allowed to performs this action");
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

    const { user: actor } = getRequestContext();
    if (!actor) throw new Error("401: Unauthenticated");

    const source = await getConnection();
    const fileRepository = source.getRepository(File);
    const file = await fileRepository.findOneBy({ id });
    if (!file) throw new Error("404: File not found");

    if (actor?.meta.role != "admin" && actor?.id != file.uId) {
        throw new Error("403: Not allowed to performs this action");
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

