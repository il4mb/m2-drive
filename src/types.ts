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
