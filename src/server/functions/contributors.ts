'use server'

import { getConnection } from "@/data-source"
import Contributor from "@/entities/Contributor";
import { currentTime } from "@/libs/utils";
import { createFunction, writeActivity } from "../funcHelper";
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission } from "../checkPermission";
import { File } from "@/entities/File";
import User from "@/entities/User";

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
    const fileRepository = source.getRepository(File);
    const userRepository = source.getRepository(User);

    const existing = await contributorRepository.findOne({ where: { fileId, userId } });
    if (existing) {
        throw new Error("Contributor already exists for this file.");
    }

    const user = await userRepository.findOneBy({ id: userId });
    const file = await fileRepository.findOneBy({ id: fileId });

    if (!user || !file) {
        throw new Error("Failed Add Contributor: User or File not found!");
    }

    const contributor = contributorRepository.create({
        fileId,
        userId,
        role,
        createdAt: currentTime()
    });

    await contributorRepository.save(contributor);
    writeActivity("ADD_CONTRIBUTOR", `Menambahkan ${user.name} sebagai ${contributor.role} pada ${file?.type} ${file?.name}`);
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

    const contributor = await contributorRepository.findOne({ where: { id }, relations: ['user', 'file'] });
    if (!contributor) {
        throw new Error("404: Kontributor tidak ditemukan!");
    }
    const user = contributor.user;
    const file = contributor.file;

    contributor.role = role;
    contributor.updatedAt = currentTime();
    await contributorRepository.save(contributor);

    writeActivity("EDIT_CONTRIBUTOR", `Memperbarui ${user.name} sebagai ${contributor.role} pada ${file?.type} ${file?.name}`);
})


export const removeFileContributor = createFunction(async ({ id }: { id: string }) => {

    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-manage-sharing");

    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);

    const contributor = await contributorRepository.findOne({ where: { id }, relations: ['user', 'file'] });
    if (!contributor) {
        throw new Error("404: Kontributor tidak ditemukan!");
    }
    const user = contributor.user;
    const file = contributor.file;

    await contributorRepository.remove(contributor);

    writeActivity("DELETE_CONTRIBUTOR", `Mengeluarkan ${user.name} pada ${file?.type} ${file?.name}`);
})
