import "reflect-metadata"
import { DataSource } from "typeorm"
import { File } from "./entity/File"
import { Options } from "./entity/Options";
import Contributor from "./entity/Contributor";

const source = new DataSource({
    type: "sqlite",
    database: `${process.cwd()}/database.sqlite`,
    synchronize: true,
    logging: false,
    entities: [
        File,
        Options,
        Contributor
    ],
    cache: true
});

export const getSource = async () => {
    if (!source.isInitialized) {
        await source.initialize();
    }
    return source;
}


