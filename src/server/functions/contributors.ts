'use server'

import { getConnection } from "@/data-source"
import Contributor from "@/entity/Contributor";
import { currentTime } from "@/libs/utils";
import { createFunction } from "../funcHelper";

export const getFileContributors = createFunction<{ fileId: string }, Contributor[]>(async ({ fileId }) => {
  
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
export const addFileContributor = createFunction<AddContributors>(async ({ fileId, userId, role }) => {

    if (!fileId || !userId) throw new Error("400: Request tidak valid!");
    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);
    const contributor = contributorRepository.create({
        fileId,
        userId,
        role,
        createdAt: currentTime()
    });
    await contributorRepository.save(contributor);

})




type UpdateContributors = {
    contributorId: string,
    role: "viewer" | "editor"
}
export const updateFileContributor = createFunction<UpdateContributors>(async ({ contributorId: id, role }) => {

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


export const removeFileContributor = createFunction<{ id: string }>(async ({ id }) => {
    const source = await getConnection();
    const contributorRepository = source.getRepository(Contributor);

    const contributor = await contributorRepository.findOneBy({ id });
    if (!contributor) {
        throw new Error("404: Kontributor tidak ditemukan!");
    }
    await contributorRepository.remove(contributor);
})
