'use client'

import Container from "@/components/Container";
import StickyHeader from "@/components/navigation/StickyHeader";
import { Breakpoint, Button, Paper, Stack, Typography, useTheme } from "@mui/material";
import { HardDrive, UploadCloud, } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";
import { File } from "@/entity/File";
import { ModuleViewerManager } from "@/viewer/ModuleViewerManager";
import { StickyHeaderManager } from "@/components/navigation/StickyHeaderManager";
import { AnimatePresence } from "motion/react";
import FileViewerLayout from "@/viewer/FileViewerLayout";
import MobileAction from "@/components/navigation/MobileAction";
import Link from "next/link";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
import ActionNewFolder from "@/components/menu-actions/ActionNewFolder";
import { useCurrentSession } from "@/components/context/CurrentSessionProvider";

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

    const { userId } = useCurrentSession();
    const contextMenu = useContextMenu();
    const theme = useTheme();
    const { pId } = useParams<{ pId: string[] }>();
    const firstId = pId?.[0];

    useEffect(() => {
        // const removeMenu = contextMenu.addMenu("addFolder", ActionNewFolder);
        const removeState = contextMenu.addState({ userId })
        return () => {
            removeState();
            // removeMenu();
        };
    }, [userId]);

    if (pId?.length > 0) {
        return (
            <FileViewerLayout
                pathList={pId}
                pageEndpoint={`/drive/${firstId}/{ID}`}
                endpointResolve={(file) => `/drive/${firstId}/${[...pId.splice(1), file.id].join("/")}`}
                canGoBack>
                {children}
            </FileViewerLayout>
        )
    }

    return (
        <ModuleViewerManager endpoint="/drive/{ID}">
            <Stack flex={1} overflow={"hidden"}>
                <Container maxWidth={'lg'} scrollable>
                    <StickyHeaderManager>
                        <StickyHeader actions={(
                            <Button
                                LinkComponent={Link}
                                href="/drive/upload"
                                variant="contained"
                                size="large"
                                startIcon={<UploadCloud size={18} />}>
                                Upload
                            </Button>
                        )}>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent={"space-between"}>
                                <Stack flex={1} direction={"row"} alignItems={"center"} spacing={1}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <HardDrive size={28} color={theme.palette.primary.main} />
                                        <Typography component={"div"} fontSize={22} fontWeight={700}>
                                            My Drive
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </StickyHeader>

                        <Paper sx={{ display: 'flex', flexDirection: 'column', flex: 1, borderRadius: 2, boxShadow: 2, minHeight: 'max(600px, 85vh)' }}>
                            {children}
                        </Paper>
                    </StickyHeaderManager>
                </Container>
            </Stack>
        </ModuleViewerManager>
    );
}