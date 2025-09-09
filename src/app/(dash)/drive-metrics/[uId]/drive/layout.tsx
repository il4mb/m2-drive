'use client'

import { Breakpoint, Stack } from "@mui/material";
import { useParams } from "next/navigation";
import { Dispatch, ReactNode, SetStateAction, useEffect } from "react";
import { File } from "@/entities/File";
import { ModuleViewerManager } from "@/viewer/ModuleViewerManager";
import { AnimatePresence } from "motion/react";
import FileViewerLayout from "@/viewer/FileViewerLayout";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
import ActionNewFolder from "@/components/menu-actions/ActionNewFolder";

export type DriveLayoutState = {
    userId: string;
    folder: File | null;
    layout: "grid" | "list";
    setLayout: (l: DriveLayoutState["layout"]) => void;
    order: "ASC" | "DESC";
    setOrder: (s: DriveLayoutState["order"]) => void;
    sort: "type" | "name" | "createdAt" | "updatedAt";
    setSort: (s: DriveLayoutState["sort"]) => void;
    setParent: (f: File | null) => void;
    setLoading: (b: boolean) => void;
    keyword: string;
    setMaxWidth: Dispatch<SetStateAction<Breakpoint>>;
}

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {

    const contextMenu = useContextMenu();
    const { fId, uId, } = useParams<{ uId: string; fId: string[] }>();
    const firstId = fId?.[0];

    // useEffect(() => {
    //     return contextMenu.addMenu("addFolder", ActionNewFolder);
    // }, []);

    if (fId?.length > 0) {
        return (
            <FileViewerLayout
                pathList={fId}
                pageEndpoint={`/drive-root/${uId}/drive/${firstId}/{ID}`}
                canGoBack>
                {children}
            </FileViewerLayout>
        )
    }

    return (
        <AnimatePresence mode={"wait"}>
            <ModuleViewerManager endpoint={`/drive-root/${uId}/drive/{ID}`}>
                <Stack flex={1} overflow={"hidden"}>
                    {children}
                </Stack>
            </ModuleViewerManager>
        </AnimatePresence>
    );
}