'use server'

import { getRequestContext } from "@/libs/requestContext";
import { createFunction } from "../funcHelper";
import { getConnection } from "@/data-source";
import { File } from "@/entity/File";
import Contributor from "@/entity/Contributor";
import { Repository } from "typeorm";

type FilePreflight = {
    fileId: string;
    subsId?: string[];
};

export const filePreflight = createFunction(async ({ fileId, subsId }: FilePreflight) => {
    const { user: actor } = getRequestContext();

    const connection = await getConnection();
    const fileRepository = connection.getRepository(File);
    const contributorRepository = connection.getRepository(Contributor);

    // 1️⃣ Get root file
    const rootFile = await fileRepository.findOneBy({ id: fileId });
    if (!rootFile) throw new Error("File not found");

    // @ts-ignore
    if (rootFile.meta?.Key) {
        delete (rootFile.meta as any).Key;
    }

    // 2️⃣ Validate tree and get final target file
    const targetFile = await validateTreeAndGetTarget(subsId, fileRepository, rootFile);

    // 3️⃣ Check guest access
    if (['viewer', 'editor'].includes(rootFile.meta?.generalPermit || 'none')) {
        return targetFile;
    }

    // 4️⃣ If no actor after guest check → deny
    if (!actor) throw new Error("Access forbidden: generalPermit restriction");

    // 5️⃣ Direct access for owner, admin, system
    if (
        actor === "system" ||
        rootFile.uId === actor.id ||
        actor.meta?.role === "admin"
    ) {
        return targetFile;
    }

    // 6️⃣ Check contributor for root
    const contributor = await contributorRepository.findOneBy({
        fileId,
        userId: actor.id
    });

    if (contributor) {
        return targetFile;
    }

    throw new Error("Access denied");
});

/**
 * Ensure subsId chain is continuous from rootId down to last child
 * and return the last file in the chain (or root if no subsId)
 */
async function validateTreeAndGetTarget(subsId: string[] | undefined, fileRepository: Repository<File>, rootFile: File): Promise<File> {
    if (!subsId?.length) return rootFile;

    let parentFile = rootFile;
    for (const subId of subsId) {
        const subFile = await fileRepository.findOneBy({ id: subId, pId: parentFile.id });
        if (!subFile) throw new Error(`Sub file ${subId} not found`);
        if (subFile.pId !== parentFile.id) {
            throw new Error(`Invalid tree path: ${subId} is not a child of ${parentFile.id}`);
        }
        // @ts-ignore
        if (subFile.meta?.Key) {
            delete (subFile.meta as any).Key;
        }
        parentFile = subFile; // move down
    }

    return parentFile;
}
