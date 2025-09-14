import "reflect-metadata"
import { DataSource } from "typeorm"
import { File } from "./entities/File"
import { Options } from "./entities/Options";
import Contributor from "./entities/Contributor";
import Token from "./entities/Token";
import User from "./entities/User";
import Role from "./entities/Role";
import { RoleSubscriber } from "./entities/subscribers/RoleSubscriber";
import { UserSubscriber } from "./entities/subscribers/UserSubscriber";
import { Task } from "./entities/Task";
import { FileSubscriber } from "./entities/subscribers/FileSubscriber";
import { DatabaseSubscriber } from "./server/database/databaseSubscriber";
import { Activity } from "./entities/Activity";
import Storage from "./entities/Storage";

const dev = process.env.NODE_ENV !== "production";
export const databasePath = `${process.cwd()}/database.sqlite`;

const source = new DataSource({
    type: "sqlite",
    database: databasePath,
    synchronize: dev,
    logging: false,
    entities: [
        User,
        File,
        Options,
        Contributor,
        Token,
        Role,
        Task,
        Activity,
        Storage
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


