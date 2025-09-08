'use server'

import { getConnection } from "@/data-source"
import { File } from "@/entity/File";
import { currentTime, generateKey } from "@/libs/utils";
import { createFunction } from "../funcHelper";
import { IsNull, Repository } from "typeorm";
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission, checkPermissionSilent } from "../checkPermission";


type CopyMoveProps = {
    userId?: string;
    sourceId: string;
    targetId: string | null;
    conflictResolution?: "rename" | "overwrite" | "skip";
}

export const copyFile = createFunction(
    async ({ userId, sourceId, targetId, conflictResolution = "rename" }: CopyMoveProps) => {
        if (!sourceId) {
            throw new Error("400: Invalid request - sourceId is required");
        }

        if (sourceId === targetId) {
            throw new Error("400: Cannot copy to the same folder");
        }

        const { user: actor } = getRequestContext();
        const canManage = await checkPermissionSilent(actor, "can-manage-drive-root");
        if (!canManage) {
            await checkPermission(actor, "can-edit-file");
        }
        const connection = await getConnection();
        const fileRepository = connection.getRepository(File);

        // Validate target folder if specified
        if (targetId) {
            const targetFolder = await fileRepository.findOne({
                where: { id: targetId, type: "folder" }
            });
            if (!targetFolder) {
                throw new Error("404: Target folder not found");
            }
            // Check if user has permission to copy to target folder
            if (!canManage && actor != "system" && actor?.meta.role != "admin" && userId && targetFolder.uId !== userId) {
                throw new Error("403: No permission to copy to this folder");
            }
        }

        // Helper: Check for circular reference
        const checkCircularReference = async (sourceId: string, targetId: string | null): Promise<boolean> => {
            if (!targetId) return false;

            let currentId: any = targetId;
            while (currentId) {
                if (currentId === sourceId) return true;
                const parent = await fileRepository.findOne({
                    where: { id: currentId },
                    select: ["pId"]
                });
                currentId = parent?.pId || null;
            }
            return false;
        };

        if (await checkCircularReference(sourceId, targetId)) {
            throw new Error("400: Cannot copy folder into itself or its subfolders");
        }

        // Helper: Generate unique name in target folder
        const getUniqueName = async (baseName: string, parentId: string | null, ownerId: string): Promise<string> => {
            const siblings = await fileRepository.find({
                where: {
                    pId: parentId || IsNull(),
                    uId: ownerId
                }
            });

            const siblingNames = new Set(siblings.map(s => s.name));
            if (!siblingNames.has(baseName)) return baseName;

            if (conflictResolution === "overwrite") {
                return baseName;
            }

            if (conflictResolution === "skip") {
                throw new Error("409: File with same name exists and skip resolution chosen");
            }

            // Default: rename with counter
            let counter = 1;
            let newName = `${baseName} (copy)`;
            while (siblingNames.has(newName)) {
                counter++;
                newName = `${baseName} (copy ${counter})`;
            }
            return newName;
        };

        const copiedItems = new Map<string, string>();
        const copyStats = {
            filesCopied: 0,
            foldersCopied: 0,
            totalSize: 0
        };

        const copyItem = async (fileId: string, newParentId: string | null): Promise<File> => {
            if (copiedItems.has(fileId)) {
                return fileRepository.findOneByOrFail({ id: copiedItems.get(fileId)! });
            }

            const original = await fileRepository.findOneBy({
                id: fileId
            });

            if (!original) {
                throw new Error("404: File not found");
            }

            const tags = original.meta?.tags || [];
            if (tags.includes('no-clone')) {
                throw new Error("403: Menyalin tidak diperbolehkan!");
            }


            // Use userId if provided, otherwise use the original file's uId
            const finalOwnerId = userId || original.uId;
            const finalName = await getUniqueName(original.name, newParentId, finalOwnerId);

            // Handle overwrite scenario
            if (conflictResolution === "overwrite" && finalName === original.name) {
                const existingFile = await fileRepository.findOneBy({
                    pId: newParentId ? newParentId : IsNull(),
                    uId: finalOwnerId,
                    name: original.name
                });

                if (existingFile) {
                    if (existingFile.type !== original.type) {
                        throw new Error("400: Cannot overwrite file with different type");
                    }
                    // Remove existing file to be replaced
                    await fileRepository.remove(existingFile);
                }
            }

            // Create copy with JSON meta field
            const copy = fileRepository.create({
                ...original,
                id: generateKey(12),
                pId: newParentId,
                uId: finalOwnerId, // Use the determined owner ID
                name: finalName,
                createdAt: currentTime(),
                updatedAt: null,
                meta: original.meta ? { ...original.meta } : {} // Copy meta as plain object
            });

            await fileRepository.save(copy);
            copiedItems.set(fileId, copy.id);

            // Update statistics
            if (copy.type === "folder") {
                copyStats.foldersCopied++;
            } else {
                copyStats.filesCopied++;
                copyStats.totalSize += (copy.meta as any)?.size || 0;
            }

            if (original.type === "folder") {
                const children = await fileRepository.find({
                    where: { pId: original.id },
                    order: { createdAt: "ASC" }
                });

                await Promise.all(children.map(child =>
                    copyItem(child.id, copy.id)
                ));
            }

            return copy;
        };

        const result = await copyItem(sourceId, targetId || null);

        // Update target folder item count if it's a folder
        if (targetId) {
            await updateFolderItemCount(targetId, fileRepository);
        }

        return {
            success: true,
            copiedFile: result,
            stats: copyStats
        };
    }
);

export const moveFile = createFunction(
    async ({ userId, sourceId, targetId, conflictResolution = "rename" }: CopyMoveProps) => {

        if (sourceId === targetId) {
            throw new Error("400: Cannot move to the same folder");
        }

        if (!sourceId) {
            throw new Error("400: Invalid request - sourceId is required");
        }

        const { user: actor } = getRequestContext();
        const canManage = await checkPermissionSilent(actor, "can-manage-drive-root");
        if (!canManage) {
            await checkPermission(actor, "can-edit-file");
        }
        const connection = await getConnection();
        const repository = connection.getRepository(File);

        const file = await repository.findOne({
            where: { id: sourceId }
        });

        if (!file) {
            throw new Error("404: File not found");
        }

        const tags = file.meta?.tags || [];
        if (tags.some(tag => ['no-edit', 'no-clone'].includes(tag))) {
            throw new Error("403: Memindah tidak diperbolehkan!");
        }

        // Check permission - user can only move their own files unless no userId is provided
        if (!canManage && actor != "system" && actor?.meta.role != "admin" && userId && file.uId !== userId) {
            throw new Error("403: No permission to move this file");
        }

        if (file.pId === targetId) {
            throw new Error("400: File is already in the target folder");
        }

        // Validate target folder if specified
        let targetFolder: File | null = null;
        if (targetId) {
            targetFolder = await repository.findOne({
                where: { id: targetId, type: "folder" }
            });

            if (!targetFolder) {
                throw new Error("404: Target folder not found");
            }

            // Check if user has permission to move to target folder
            if (!canManage && actor != "system" && actor?.meta.role != "admin" && userId && targetFolder.uId !== userId) {
                throw new Error("403: No permission to move to this folder");
            }
        }

        // Check for circular reference
        const checkCircularReference = async (sourceId: string, targetId: string | null): Promise<boolean> => {
            if (!targetId) return false;

            let currentId: any = targetId;
            while (currentId) {
                if (currentId === sourceId) return true;
                const parent = await repository.findOne({
                    where: { id: currentId },
                    select: ["pId"]
                });
                currentId = parent?.pId || null;
            }
            return false;
        };

        if (await checkCircularReference(sourceId, targetId)) {
            throw new Error("400: Cannot move folder into itself or its subfolders");
        }

        // Helper: Generate unique name in target folder
        const getUniqueName = async (baseName: string, parentId: string | null, ownerId: string): Promise<string> => {
            const siblings = await repository.find({
                where: {
                    pId: parentId || IsNull(),
                    uId: ownerId
                }
            });

            const siblingNames = new Set(siblings.map(s => s.name));
            if (!siblingNames.has(baseName)) return baseName;

            if (conflictResolution === "overwrite") {
                return baseName;
            }

            if (conflictResolution === "skip") {
                throw new Error("409: File with same name exists and skip resolution chosen");
            }

            // Default: rename with counter
            let counter = 1;
            let newName = `${baseName} (moved)`;
            while (siblingNames.has(newName)) {
                counter++;
                newName = `${baseName} (moved ${counter})`;
            }
            return newName;
        };

        // Use userId if provided, otherwise use the original file's uId
        const finalOwnerId = userId || file.uId;
        const finalName = await getUniqueName(file.name, targetId || null, finalOwnerId);

        // Handle overwrite scenario
        if (conflictResolution === "overwrite" && finalName === file.name) {
            const existingFile = await repository.findOne({
                where: {
                    pId: targetId ? targetId : IsNull(),
                    uId: finalOwnerId,
                    name: file.name
                }
            });

            if (existingFile) {
                if (existingFile.type !== file.type) {
                    throw new Error("400: Cannot overwrite file with different type");
                }
                // Remove existing file to be replaced
                await repository.remove(existingFile);
            }
        }

        const oldParentId = file.pId;
        const oldOwnerId = file.uId;

        file.pId = targetId || null;
        file.uId = finalOwnerId;
        file.name = finalName;
        file.updatedAt = currentTime();

        await repository.save(file);

        // If owner changes → update children recursively
        if (oldOwnerId !== finalOwnerId && file.type === "folder") {
            await updateChildrenOwner(file.id, finalOwnerId, repository);
        }

        // Update folder item counts
        if (oldParentId) {
            await updateFolderItemCount(oldParentId, repository);
        }
        if (targetId) {
            await updateFolderItemCount(targetId, repository);
        }

        return {
            success: true,
            movedFile: file,
            oldParentId,
            newParentId: targetId
        };
    }
);

/**
 * Update folder item count in meta JSON field
 */
async function updateFolderItemCount(folderId: string, repository: Repository<File>): Promise<void> {
    const itemCount = await repository.count({
        where: { pId: folderId }
    });

    // Get current folder to preserve other meta properties
    const folder = await repository.findOneBy({ id: folderId });
    if (!folder) return;

    const updatedMeta = {
        ...(folder.meta as Record<string, any> || {}),
        itemCount
    };

    await repository.update(folderId, {
        meta: updatedMeta
    });
}

/**
 * Recursively update children owner
 */
async function updateChildrenOwner(folderId: string, newOwnerId: string, repository: Repository<File>): Promise<void> {
    const children = await repository.find({
        where: { pId: folderId },
        order: { createdAt: "ASC" }
    });

    for (const child of children) {
        child.uId = newOwnerId;
        child.updatedAt = currentTime();
        await repository.save(child);

        if (child.type === "folder") {
            await updateChildrenOwner(child.id, newOwnerId, repository);
        }
    }
}

/**
 * Additional utility function for bulk operations
 */
type BulkCopyMoveProps = {
    userId: string;
    sourceIds: string[];
    targetId: string | null;
    operation: "copy" | "move";
    conflictResolution?: "rename" | "overwrite" | "skip";
}
export const bulkCopyMove = createFunction(
    async ({ userId, sourceIds, targetId, operation, conflictResolution = "rename" }: BulkCopyMoveProps) => {


        const { user: actor } = getRequestContext();
        const canManage = await checkPermissionSilent(actor, "can-manage-drive-root");
        if (!canManage) {
            await checkPermission(actor, "can-edit-file");
        }
        const results = [];
        const errors = [];

        for (const sourceId of sourceIds) {
            try {
                if (operation === "copy") {
                    const result = await copyFile({ userId, sourceId, targetId, conflictResolution });
                    results.push(result);
                } else {
                    const result = await moveFile({ userId, sourceId, targetId, conflictResolution });
                    results.push(result);
                }
            } catch (error: any) {
                errors.push({
                    sourceId,
                    error: error.message
                });
            }
        }

        return {
            success: results.length > 0,
            results,
            errors,
            summary: {
                total: sourceIds.length,
                successful: results.length,
                failed: errors.length
            }
        };
    }
);