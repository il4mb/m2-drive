import { EventSubscriber, EntitySubscriberInterface, InsertEvent, RemoveEvent } from "typeorm";
import User from "../User";
import { File } from "../File";
import { generateKey } from "@/libs/utils";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    listenTo() {
        return User;
    }

    async afterInsert(event: InsertEvent<User>) {
        const user = event.entities;
        if (!user || !user.id) return; // Guard

        const fileRepository = event.manager.getRepository(File);
        const folderNames = ["Documents", "Pictures", "Videos", "Music"];

        const createFolders = folderNames.map(async (name) => {
            const file = fileRepository.create({
                id: generateKey(12),
                uId: user.id,
                name: name,
                type: "folder",
                meta: {
                    itemCount: 0
                },
                createdAt: Date.now()
            });

            await fileRepository.save(file);
        })

        await Promise.all(createFolders);

    }

    async afterRemove(event: RemoveEvent<User>) {
        const userId = event.entities?.id ?? event.entityId;
        if (!userId) return;

        // Optional: Remove all files belonging to this user
        await event.manager.getRepository(File).delete({ uId: userId });
    }
}
