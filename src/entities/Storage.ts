import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("storage")
export default class Storage {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'int' })
    size!: number;

    @Column({ type: 'json' })
    committed: StorageItem = { count: 0, size: 0 };

    @Column({ type: 'json' })
    multipart: Multipart = { count: 0, uploads: [] };

    @Column({ type: 'json' })
    versions: StorageItem = { count: 0, size: 0 };

    @Column({ type: 'json', name: 'garbageItems' })
    garbageItems: GarbageItem[] = [];

    @Column({ type: 'int' })
    createdAt!: number;
}


type Multipart = {
    count: number;
    uploads: {
        key: string;
        initiated: string | undefined;
    }[]
}
type StorageItem = {
    count: number;
    size: number,
}

type GarbageItem = {
    key: string;
    size: number;
}