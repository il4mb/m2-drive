'use server'

import { getSource } from "@/data-source"
import Contributor from "@/entity/Contributor";
import { currentTime } from "@/libs/utils";
import { withAction } from "@/libs/withApi"

export const getFileContributors = withAction<{ fileId: string }, Contributor[]>(async ({ fileId }) => {
    const source = await getSource();
    const contributorRepository = source.getRepository(Contributor);
    const contributors = await contributorRepository.find({
        where: { fileId },
        relations: { user: true },
    });
    const data = JSON.parse(JSON.stringify(contributors));

    return {
        status: true,
        message: "Ok",
        data
    }
});

export const addFileContributors = withAction<{ fileId: string, userId: string, role: "viewer" | "editor" }>(
    async ({ fileId, userId, role }) => {

        if (!fileId || !userId) throw new Error("400: Request tidak valid!");
        const source = await getSource();
        const contributorRepository = source.getRepository(Contributor);

        const contributor = contributorRepository.create({
            fileId,
            userId,
            role,
            createdAt: currentTime()
        });
        await contributorRepository.save(contributor);

        const data = JSON.parse(JSON.stringify(contributor));

        const io = globalThis.ioServer;
        if (io) {
            io.emit("update", {
                collection: "contributor",
                action: "add",
                columns: { userId: contributor.userId, fileId: contributor.fileId },
                data
            });
        }

        return { status: true, message: "Ok" };
    }
);

// ✅ Update contributor role
export const updateFileContributor = withAction<{ id: string, role: "viewer" | "editor" }>(
    async ({ id, role }) => {
        const source = await getSource();
        const contributorRepository = source.getRepository(Contributor);

        const contributor = await contributorRepository.findOneBy({ id });
        if (!contributor) {
            throw new Error("404: Kontributor tidak ditemukan!");
        }

        contributor.role = role;
        contributor.updatedAt = currentTime();
        await contributorRepository.save(contributor);

        const data = JSON.parse(JSON.stringify(contributor));

        const io = globalThis.ioServer;
        if (io) {
            io.emit("update", {
                collection: "contributor",
                action: "update",
                columns: { id, fileId: contributor.fileId },
                data
            });
        }

        return { status: true, message: "Ok" };
    }
);

// ✅ Remove contributor
export const removeFileContributor = withAction<{ id: string }>(
    async ({ id }) => {
        const source = await getSource();
        const contributorRepository = source.getRepository(Contributor);

        const contributor = await contributorRepository.findOneBy({ id });
        if (!contributor) {
            throw new Error("404: Kontributor tidak ditemukan!");
        }

        await contributorRepository.remove(contributor);

        const io = globalThis.ioServer;
        if (io) {
            io.emit("update", {
                collection: "contributor",
                action: "remove",
                columns: { id, fileId: contributor.fileId }
            });
        }

        return { status: true, message: "Ok" };
    }
);
