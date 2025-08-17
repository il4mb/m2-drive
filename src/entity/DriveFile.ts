import { Column, Entity, PrimaryColumn, Unique, Index } from "typeorm";

@Entity('files')
@Unique(['id', 'uId', 'name', 'fId'])
@Index(['uId', 'fId']) // For faster folder queries
@Index(['uId', 'type']) // For faster type filtering
@Index(['uId', 'createdAt']) // For sorting
export class DriveFile {
    @PrimaryColumn()
    id!: string;

    @Column()
    uId!: string;

    @Column({ type: 'varchar', nullable: true })
    fId: string | null = null;

    @Column()
    name!: string;

    @Column()
    type!: "file" | "folder";

    @Column({ type: "json", default: null, nullable: true })
    meta: FileMeta | null = null;

    @Column({ type: 'int' })
    createdAt!: number;

    @Column({ type: 'int', default: null, nullable: true })
    updatedAt: number | null = null;
}

type FileMeta = {
    starred?: boolean;
    trashed?: boolean;
    trashedAt?: number;
    sharedWith?: string[]; // User IDs
    sharePermissions?: 'view' | 'edit' | 'manage';
    description?: string;
    size?: number; // File size in bytes
    mimeType?: string;
    thumbnail?: string; // URL or path to thumbnail
    tags?: string[];
    lastOpen?: number;
    Key?: string;
    // Add any other custom metadata fields
};

export type IDriveFile = InstanceType<typeof DriveFile>;