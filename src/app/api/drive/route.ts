import { getSource } from "@/data-source"
import Contributor from "@/entity/Contributor";
import { File } from "@/entity/File";
import { currentTime, generateKey } from "@/libs/utils";
import { withApi } from "@/libs/withApi"
import { NextRequest, NextResponse } from "next/server";
import { IsNull, Brackets } from "typeorm";

export const GET = withApi(async (req) => {

    const { searchParams } = new URL(req.url);
    const pId = searchParams.get("pId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const starred = searchParams.get("starred");
    const trashed = searchParams.get("trashed");
    const recursive = searchParams.get("recursive");

    const sortBy = searchParams.get("sortBy") || "type";
    const order = (searchParams.get("order") || "DESC").toUpperCase() as | "ASC" | "DESC";

    const uId = "1";
    const source = await getSource();
    const repository = source.getRepository(File);

    const qb = repository.createQueryBuilder("file").where("file.uId = :uId", {
        uId,
    });

    if (!recursive) {
        if (pId) {
            qb.andWhere("file.pId = :pId", { pId });
            const parent = await repository.findOne({ where: { id: pId } });
            if (parent) {
                const meta = { ...(parent.meta || {}), lastOpen: currentTime() };
                repository.update({ id: pId }, { meta });
            }
        } else {
            qb.andWhere("file.pId IS NULL");
        }
    }

    if (type) {
        qb.andWhere("file.type = :type", { type });
    }

    if (search) {
        qb.andWhere("file.name ILIKE :search", { search: `%${search}%` });
    }

    if (starred === "true") {
        qb.andWhere("file.meta ->> 'starred' = true");
    }

    if (trashed === "true") {
        qb.andWhere("file.meta ->> 'trashed' = true");
    } else {
        qb.andWhere(
            new Brackets((qb2) => {
                qb2.where("file.meta IS NULL")
                    .orWhere("file.meta ->> 'trashed' IS NULL")
                    .orWhere("file.meta ->> 'trashed' = 'false'");
            })
        );
    }

    // 🔑 Sorting handler
    const allowedSort = {
        createdAt: "file.createdAt",
        updatedAt: "file.updatedAt",
        type: "file.type",
        trashedAt: "file.meta ->> 'trashedAt'",
    } as const;

    const sortColumn = allowedSort[sortBy as keyof typeof allowedSort];
    if (sortColumn) {
        qb.orderBy(sortColumn, order);
    } else {
        // fallback to updatedAt
        qb.orderBy("file.updatedAt", "DESC");
    }

    const files = await qb.getMany();

    return {
        status: true,
        message: "Ok",
        data: JSON.parse(JSON.stringify(files)),
    };
});


type Action = {
    [key: string]: (req: NextRequest, res: NextResponse) => Promise<{ status: boolean; message: string; data?: any; }>
};

const ACTIONS: Action = {
    // Create new file or folder
    create: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();

        const newFile = new File();
        newFile.id = generateKey(8);
        newFile.uId = '1'; // From auth
        newFile.name = body.name;
        newFile.type = body.type || 'file';
        newFile.pId = body.pId || null;
        newFile.createdAt = currentTime();
        newFile.meta = body.meta || null;

        await repository.save(newFile);

        return {
            status: true,
            message: "File created successfully",
            data: newFile
        };
    },

    // Copy file/folder (and its contents if folder)
    copy: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        // Track copied items to prevent circular references
        const copiedItems = new Map<string, string>(); // originalId → newId

        const copyItem = async (fileId: string, newParentId: string | null, uId: string) => {
            // Check if we've already copied this item
            if (copiedItems.has(fileId)) {
                return copiedItems.get(fileId)!;
            }

            const original = await repository.findOneBy({
                id: fileId,
                uId: '1'
            });

            if (!original) {
                throw new Error("404: File not found");
            }

            const copy = new File();
            Object.assign(copy, original);
            copy.id = generateKey(8);
            copy.uId = uId;
            copy.pId = newParentId;
            copy.name = body.newName || `${original.name}`;
            copy.createdAt = Date.now();
            copy.updatedAt = null;
            copy.meta = original.meta;

            await repository.save(copy);
            copiedItems.set(fileId, copy.id);

            // If it's a folder, copy all its contents
            if (original.type === 'folder') {
                const children = await repository.findBy({
                    pId: original.id,
                    uId
                });

                // Use Promise.all for parallel copying (faster)
                await Promise.all(children.map(child =>
                    copyItem(child.id, copy.id, uId)
                ));
            }

            return copy;
        };

        const copy = await copyItem(body.sourceId, body.targetId || null, uId);

        return {
            status: true,
            message: "File copied successfully",
            data: copy
        };
    },

    // Move file/folder to new location
    move: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        if (!body.sourceId) throw new Error("400: Invalid request!");

        const file = await repository.findOneBy({
            id: body.sourceId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        // Check if target folder exists
        if (body.targetId) {
            const targetFolder = await repository.findOneBy({
                id: body.targetId,
                uId,
                type: 'folder'
            });

            if (!targetFolder) {
                throw new Error("404: Target folder not found");
            }
        }

        file.pId = body.targetId || null;
        file.updatedAt = currentTime();

        await repository.save(file);

        return {
            status: true,
            message: "File moved successfully",
            data: file
        };
    },

    // Delete file/folder (soft delete to trash)
    delete: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        if (!body.fileId) throw new Error("400: Invalid request!");

        const file = await repository.findOneBy({
            id: body.fileId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        // Soft delete by marking as trashed
        file.meta = {
            ...(file.meta || {}),
            trashed: true,
            trashedAt: currentTime()
        };

        await repository.save(file);

        return {
            status: true,
            message: "File moved to trash",
            data: file
        };
    },

    // Restore from trash
    restore: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        const file = await repository.findOneBy({
            id: body.fileId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        // Remove trashed flag
        const meta = { ...file.meta };
        delete meta.trashed;
        delete meta.trashedAt;

        file.meta = Object.keys(meta).length ? meta : null;
        file.updatedAt = currentTime();

        await repository.save(file);

        return {
            status: true,
            message: "File restored from trash",
            data: file
        };
    },

    // Permanent delete
    permanentDelete: async (req, res) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';


        const file = await repository.findOneBy({
            id: body.fileId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        // First delete all children if it's a folder
        if (file.type === 'folder') {
            const children = await repository.findBy({
                pId: file.id,
                uId
            });

            for (const child of children) {
                await ACTIONS.permanentDelete({
                    json: () => Promise.resolve({ fileId: child.id })
                } as any, res);
            }
        }

        // Then delete the file itself
        await repository.remove(file);

        return {
            status: true,
            message: "File permanently deleted",
            data: { id: file.id }
        };
    },

    // Rename file/folder
    rename: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        const file = await repository.findOneBy({
            id: body.fileId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        // Check if name already exists in the same folder
        const existing = await repository.findOneBy({
            name: body.newName,
            pId: file.pId ? file.pId : IsNull(),
            uId
        });

        if (existing && existing.id !== file.id) {
            throw new Error("400: A file with this name already exists in this location");
        }

        file.name = body.newName;
        file.updatedAt = currentTime();

        await repository.save(file);

        return {
            status: true,
            message: "File renamed successfully",
            data: file
        };
    },

    // Star/unstar file/folder
    star: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        const file = await repository.findOneBy({
            id: body.fileId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        file.meta = {
            ...(file.meta || {}),
            starred: body.starred !== false
        };

        await repository.save(file);

        return {
            status: true,
            message: body.starred !== false ? "File starred" : "File unstarred",
            data: file
        };
    },

    // Update file metadata
    updateMeta: async (req) => {
        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        const file = await repository.findOneBy({
            id: body.fileId,
            uId
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        file.meta = {
            ...(file.meta || {}),
            ...body.meta
        };

        file.updatedAt = currentTime();
        await repository.save(file);

        return {
            status: true,
            message: "File metadata updated",
            data: file
        };
    },

    // Share file/folder with other users
    share: async (req) => {

        const source = await getSource();
        const repository = source.getRepository(File);
        const body = await req.json();
        const uId = '1';

        if (!body.fileId) throw new Error("400: invalid request!");

        const file = await repository.findOneBy({ id: body.fileId, uId });

        if (!file) {
            throw new Error("404: File not found");
        }

        file.meta = {
            ...(file.meta || {}),
            generalPermit: body.generalPermit
        };

        if (!["viewer", "editor"].includes(file.meta.generalPermit || "")) {
            delete file.meta.generalPermit;
        }

        file.updatedAt = currentTime();
        await repository.save(file);

        return {
            status: true,
            message: "File sharing updated",
            data: file
        };
    },

    contributor: async (req) => {
        const source = await getSource();
        const repoFile = source.getRepository(File);
        const repoContributor = source.getRepository(Contributor);
        const body = await req.json();
        const uId = "1"; // current user (owner)

        if (!body.fileId || !body.userId || !body.role) {
            throw new Error("400: invalid request!");
        }

        // Verify file exists and belongs to current user
        const file = await repoFile.findOneBy({ id: body.fileId, uId });
        if (!file) {
            throw new Error("404: File not found");
        }

        // Check if contributor already exists
        let contributor = await repoContributor.findOneBy({
            fileId: file.id,
            uId: body.userId,
        });

        if (contributor) {
            // update role
            contributor.role = body.role;
        } else {
            // create new contributor
            contributor = repoContributor.create({
                fileId: file.id,
                uId: body.userId,
                role: body.role,
            });
        }

        await repoContributor.save(contributor);

        return {
            status: true,
            message: "Contributor updated",
            data: contributor,
        };
    },

    removeContributor: async (req) => {
        const source = await getSource();
        const repoFile = source.getRepository(File);
        const repoContributor = source.getRepository(Contributor);
        const body = await req.json();
        const uId = "1"; // current user (owner)

        if (!body.fileId || !body.userId) {
            throw new Error("400: invalid request!");
        }

        const file = await repoFile.findOneBy({ id: body.fileId, uId });
        if (!file) {
            throw new Error("404: File not found");
        }

        const contributor = await repoContributor.findOneBy({
            fileId: file.id,
            uId: body.userId,
        });

        if (!contributor) {
            throw new Error("404: Contributor not found");
        }

        await repoContributor.remove(contributor);

        return {
            status: true,
            message: "Contributor removed",
            data: contributor,
        };
    }
};

// @ts-ignore
export const POST = withApi(async (req, res) => {

    const searchParams = new URLSearchParams(req.url.split('?')[1] || '');
    const action = searchParams.get("act");

    if (!action) throw new Error("400: Invalid action!");
    if (!Object.keys(ACTIONS).includes(action)) {
        throw new Error("404: Action not recognized!");
    }

    return ACTIONS[action](req, res);
});