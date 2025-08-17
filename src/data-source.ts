import "reflect-metadata"
import { DataSource } from "typeorm"
import { DriveFile } from "./entity/DriveFile"
import { Options } from "./entity/Options";

const source = new DataSource({
    type: "sqlite",
    database: `${process.cwd()}/database.sqlite`,
    synchronize: true,
    logging: false,
    entities: [
        DriveFile,
        Options
    ],
    cache: true
});

export const getSource = async () => {
    if (!source.isInitialized) {
        await source.initialize();
    }
    return source;
}


