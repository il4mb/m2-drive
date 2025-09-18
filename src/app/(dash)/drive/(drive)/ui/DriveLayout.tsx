'use client'

import Container from "@/components/Container";
import StickyHeader from "@/components/navigation/StickyHeader";
import { Breakpoint, Button, Paper, Stack, Typography, useTheme } from "@mui/material";
import { HardDrive, UploadCloud, } from "lucide-react";
import { useParams } from "next/navigation";
import { Dispatch, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { File } from "@/entities/File";
import { ModuleViewerManager } from "@/viewer/ModuleViewerManager";
import { StickyHeaderManager } from "@/components/navigation/StickyHeaderManager";
import FileViewerLayout from "@/viewer/FileViewerLayout";
import Link from "next/link";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
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
export default function DriveLayout({ children }: layoutProps) {

    const session = useCurrentSession();
    const contextMenu = useContextMenu();
    const theme = useTheme();
    const params = useParams<{ pId: string[] }>();
    const pId = useMemo(() => params.pId, [params]);
    const firstId = useMemo(() => pId?.[0], [pId]);
    const endpoint = useMemo(() => `/drive/${firstId}/{ID}`, [firstId]);
    const userId = useMemo(() => session.userId, [session]);
    const endpointResolve = useCallback((file: File) => `/drive/${firstId}/${[...pId.splice(1), file.id].join("/")}`, [pId, firstId]);

    useEffect(() => {
        return contextMenu.addState({ userId })
    }, [userId]);

    if (pId?.length > 0) {

        return (
            <FileViewerLayout
                pathList={pId}
                pageEndpoint={endpoint}
                endpointResolve={endpointResolve}
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