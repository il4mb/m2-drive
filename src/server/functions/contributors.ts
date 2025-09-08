'use server'

import { getConnection } from "@/data-source"
import Contributor from "@/entity/Contributor";
import { currentTime } from "@/libs/utils";
import { createFunction } from "../funcHelper";
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission, checkPermissionSilent } from "../checkPermission";

export const getFileContributors = createFunction(async ({ fileId }: { fileId: string }) => {

    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);
    const contributors = await contributorRepository.find({
        where: { fileId },
        relations: { user: true },
    });

    return contributors;
});



type AddContributors = {
    fileId: string,
    userId: string,
    role: "viewer" | "editor"
}
export const addFileContributor = createFunction(async ({ fileId, userId, role }: AddContributors) => {


    if (!fileId || !userId) throw new Error("400: Request tidak valid!");

    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-manage-sharing");

    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);

    const existing = await contributorRepository.findOneBy({ fileId, userId });
    if (existing) {
        throw new Error("Contributor already exists for this file.");
    }

    const contributor = contributorRepository.create({
        fileId,
        userId,
        role,
        createdAt: currentTime()
    });

    await contributorRepository.save(contributor);

    return contributor;
});





type UpdateContributors = {
    contributorId: string,
    role: "viewer" | "editor"
}
export const updateFileContributor = createFunction(async ({ contributorId: id, role }: UpdateContributors) => {

    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-manage-sharing");

    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);

    const contributor = await contributorRepository.findOneBy({ id });
    if (!contributor) {
        throw new Error("404: Kontributor tidak ditemukan!");
    }

    contributor.role = role;
    contributor.updatedAt = currentTime();
    await contributorRepository.save(contributor);
})


export const removeFileContributor = createFunction(async ({ id }: { id: string }) => {

    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-manage-sharing");

    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);

    const contributor = await contributorRepository.findOneBy({ id });
    if (!contributor) {
        throw new Error("404: Kontributor tidak ditemukan!");
    }
    await contributorRepository.remove(contributor);
})
