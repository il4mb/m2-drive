import { EventSubscriber, EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent } from "typeorm";
import { File } from "../File";
import Contributor from "../Contributor";

@EventSubscriber()
export class FileSubscriber implements EntitySubscriberInterface<File> {

    listenTo() {
        return File;
    }

    async afterInsert(event: InsertEvent<File>) {
        const file = event.entities;
        if (!file?.id) return;

        // Only proceed if this file has a parent folder
        if (!file.pId) return;

        const fileRepository = event.manager.getRepository(File);

        // Find parent by its id, not by pId
        const parent = await fileRepository.findOneBy({ id: file.pId, type: "folder" });
        if (!parent) return;

        // @ts-ignore
        const itemCount = await fileRepository.countBy({ pId: parent.id });
        parent.meta = { ...parent.meta, itemCount };

        await fileRepository.save(parent);
    }

    async afterRemove(event: RemoveEvent<File>) {
        const file = event.entities ?? { id: event.entityId as string, pId: null };
        if (!file.pId) return;

        const fileRepository = event.manager.getRepository(File);
        const contributorRepository = event.manager.getRepository(Contributor);
        await contributorRepository.delete({ fileId: file.id });

        const parent = await fileRepository.findOneBy({ id: file.pId, type: "folder" as any });
        if (!parent) return;

        // @ts-ignore
        const itemCount = Math.max((parent.meta?.itemCount || 1) - 1, 0);
        parent.meta = { ...parent.meta, itemCount };

        await fileRepository.save(parent);
    }

    async afterUpdate(event: UpdateEvent<File<"file" | "folder">>) {
        const file = event.entities;
        if (!file?.id) return;

        // Only proceed if this file has a parent folder
        if (!file.pId) return;

        const fileRepository = event.manager.getRepository(File);

        // Find parent by its id, not by pId
        const parent = await fileRepository.findOneBy({ id: file.pId, type: "folder" });
        if (!parent) return;

        // @ts-ignore
        const itemCount = await fileRepository.countBy({ pId: parent.id });
        parent.meta = { ...parent.meta, itemCount };

        await fileRepository.save(parent);
    }
}
