import { Column, Entity, PrimaryColumn, Unique, Index } from "typeorm";

@Entity('files')
@Unique(['id', 'uId', 'name', 'pId'])
@Index(['uId', 'pId']) // For faster folder queries
@Index(['uId', 'type']) // For faster type filtering
@Index(['uId', 'createdAt']) // For sorting
export class File {
    @PrimaryColumn()
    id!: string;

    @Column()
    uId!: string;

    @Column({ type: 'varchar', nullable: true })
    // parent id is an folder 
    pId: string | null = null;

    @Column()
    name!: string;

    @Column()
    type!: "file" | "folder";

    @Column({ type: "json", default: null, nullable: true })
    meta: Meta | null = null;

    @Column({ type: 'int' })
    createdAt!: number;

    @Column({ type: 'int', default: null, nullable: true })
    updatedAt: number | null = null;
}

type Meta = {
    starred?: boolean;
    trashed?: boolean;
    trashedAt?: number;
    shared?: boolean;
    generalPermit?: 'viewer' | 'editor';
    description?: string;
    size?: number; // File size in bytes
    mimeType?: string;
    thumbnail?: string; // URL or path to thumbnail
    tags?: string[];
    lastOpen?: number;
    Key?: string;
    // Add any other custom metadata fields
};

export type IFiles = InstanceType<typeof File>;