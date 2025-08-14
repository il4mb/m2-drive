import { ReactNode } from "react";

type MenuTypeName = "link" | "group";

export type LinkMenu = {
    type: "link";
    label: string;
    href: string;
    icon?: ReactNode;
};

export type GroupMenu = {
    type: "group";
    label: string;
    icon?: ReactNode;
    children: IMenu[];
};

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
