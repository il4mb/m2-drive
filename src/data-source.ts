import "reflect-metadata"
import { DataSource } from "typeorm"
import { File } from "./entity/File"
import { Options } from "./entity/Options";
import Contributor from "./entity/Contributor";
import Token from "./entity/Token";
import User from "./entity/User";
import Role from "./entity/Role";
import { RoleSubscriber } from "./entity/RoleSubscriber";
import { UserSubscriber } from "./entity/UserSubscriber";
import { TaskQueueItem } from "./entity/TaskQueueItem";
import { FileSubscriber } from "./entity/FileSubscriber";

const source = new DataSource({
    type: "sqlite",
    database: `${process.cwd()}/database.sqlite`,
    synchronize: true,
    logging: false,
    entities: [
        User,
        File,
        Options,
        Contributor,
        Token,
        Role,
        TaskQueueItem
    ],
    subscribers: [
        UserSubscriber,
        RoleSubscriber,
        FileSubscriber
    ],
    cache: true
});

export const getSource = async () => {
    if (!source.isInitialized) {
        await source.initialize();
    }
    return source;
}


