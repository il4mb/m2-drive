import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from "typeorm";
import Role from "../Role";
import { getConnection } from "@/data-source";
import User from "../User";
import { Options } from "../Options";

@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<Role> {
    listenTo() {
        return Role;
    }

    async afterInsert(event: InsertEvent<Role>) {
        const source = await getConnection();
        const optionsRepository = source.getRepository(Options);
        const option1 = optionsRepository.create({
            id: `@drive-size-${event.entityId}`,
            value: "100gb"
        });
        const option2 = optionsRepository.create({
            id: `@max-upload-${event.entityId}`,
            value: "110mb"
        });
        await optionsRepository.save(option1);
        await optionsRepository.save(option2);
    }

    async afterRemove(event: RemoveEvent<Role>) {
        if (!event.entityId) return;

        const source = await getConnection();
        const userRepository = source.getRepository(User);
        const optionsRepository = source.getRepository(Options);

        // Ambil semua user dengan role ini
        const users = await userRepository
            .createQueryBuilder("user")
            .where("user.meta->>\"role\" = :role", { role: event.entityId })
            .getMany();

        if (users.length) {
            for (const user of users) {
                if (typeof user.meta === "object" && user.meta !== null) {
                    user.meta.role = 'user';
                }
            }
            await userRepository.save(users);
        }

        // Hapus semua option terkait role ini
        const options = await optionsRepository
            .createQueryBuilder("o")
            .where("o.id LIKE :name", { name: `@max-upload-${event.entityId}` })
            .orWhere("o.id LIKE :name", { name: `@drive-size-${event.entityId}` })
            .getMany();

        if (options.length) {
            await optionsRepository.remove(options);
            console.log(`Removed ${options.length} related options`);
        }
    }
}
