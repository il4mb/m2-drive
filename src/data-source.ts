import "reflect-metadata"
import { DataSource } from "typeorm"
import { File } from "./entity/File"
import { Options } from "./entity/Options";
import Contributor from "./entity/Contributor";
import Token from "./entity/Token";
import User from "./entity/User";
import Role from "./entity/Role";
import { RoleSubscriber } from "./entity/subscribers/RoleSubscriber";
import { UserSubscriber } from "./entity/subscribers/UserSubscriber";
import { TaskQueueItem } from "./entity/TaskQueueItem";
import { FileSubscriber } from "./entity/subscribers/FileSubscriber";
import { DatabaseSubscriber } from "./server/database/databaseSubscriber";

const dev = process.env.NODE_ENV !== "production";

const source = new DataSource({
    type: "sqlite",
    database: `${process.cwd()}/database.sqlite`,
    synchronize: dev,
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
        FileSubscriber,
        DatabaseSubscriber
    ],
    cache: true
});

export const getConnection = async () => {
    if (!source.isInitialized) {
        await source.initialize();
    }
    return source;
}


