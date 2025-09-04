import { ReactNode } from "react";
import { PERMISSION_NAMES } from "./permission";

type MenuTypeName = "link" | "group";

export type LinkMenu = {
    type: "link";
    label: string;
    href: string;
    permission?: PERMISSION_NAMES;
    icon?: ReactNode;
}

export type GroupMenu = {
    type: "group";
    label: string;
    icon?: ReactNode;
    children: IMenu[];
}

export type IMenu<T extends MenuTypeName = any> = T extends "link" ? LinkMenu : GroupMenu;




// types.ts
type BaseFile = {
    name: string;
    share?: 'none' | 'local' | 'public';
};

// Folder
export type TypeFolder = BaseFile & {
    type: 'folder';
    files: IFile[];
};

// File biasa (bukan folder)
export type TypeFile<T extends string> = BaseFile & {
    type: Exclude<T, 'folder'>;
    size: number;
    extension: string;
};

// Gabungan (union)
export type IFile = TypeFolder | TypeFile<string>;


// types.ts
export function isFolder(file: IFile): file is TypeFolder {
    return file.type === 'folder';
}



export type FileUpload = {
    id: string;
    uId: string;
    status: "pending" | "uploading" | "pause" | "error" | "stop" | "finishing" | "done";
    error?: string;
    fId: string | null;

    fileName: string;
    fileType: string;
    fileSize: number;
    thumbnail?: ArrayBuffer;

    chunkIndex: number;
    totalChunks: number;
    progress?: number;
    UploadId?: string;
    Key?: string;
    etags?: {
        ETag: string,
        PartNumber: number
    }[];
}

export type FileBlob = {
    fileId: string;
    chunks: Blob[];
}


export type Cache = {
    key: string;
    value: string;
    exp: number;
}