import { Column, Entity, PrimaryColumn, Unique, Index } from "typeorm";

export type FileTags = "no-append" | "no-edit" | "no-remove" | "no-clone" | "no-share";
export type FileType = "file" | "folder";
export interface FileMeta {
    size: number;                 // bytes
    mimeType: string;             // application/pdf, image/png, etc.
    ext: string;
    description?: string;          // optional description
    trashed?: boolean;             // soft-deleted flag
    trashedAt?: number;            // deletion timestamp
    shared?: boolean;              // is this file shared
    generalPermit: 'viewer' | 'editor' | 'none'; // access level
    thumbnail?: string;            // preview image URL
    tags: FileTags[];               // labels/categories
    lastOpened?: number;           // last opened timestamp
    Key: string;                  //  s3 Key
    pdfObjectKey?: string;
    pdfConvertedAt?: number;
}

export interface FolderMeta {
    itemCount?: number;            // number of files/folders inside
    description?: string;          // optional folder description
    shared?: boolean;              // is this folder shared
    tags?: FileTags[];               // labels/categories for search/filter
    lastOpened?: number;           // timestamp of last access
    color?: string;                // UI color coding
    generalPermit?: 'viewer' | 'editor' | 'none'; // access level
    trashed?: boolean;             // soft-deleted flag
    trashedAt?: number;            // deletion timestamp
}


@Entity('files')
@Unique(['id', 'uId', 'name', 'pId'])
@Index(['uId', 'pId']) // For faster folder queries
@Index(['uId', 'type']) // For faster type filtering
@Index(['uId', 'createdAt']) // For sorting
export class File<T extends FileType = FileType> {
    @PrimaryColumn()
    id!: string;

    @Column()
    uId!: string;

    @Column({ type: 'varchar', nullable: true })
    // parent id is an folder 
    pId: string | null = null;

    @Column()
    name!: string;

    @Column({ type: 'varchar', default: 'file' })
    type!: T;

    @Column({ type: 'json', nullable: true, default: null })
    meta: (T extends 'folder' ? FolderMeta : FileMeta) | null = null;

    @Column({ type: 'int' })
    createdAt!: number;

    @Column({ type: 'int', default: null, nullable: true })
    updatedAt: number | null = null;
}

export type Folder = File<'folder'>;
export type RegularFile = File<'file'>;