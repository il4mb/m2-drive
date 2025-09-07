'use client'

import Container from "@/components/Container";
import useLocalStorage from "@/hooks/useLocalstorage";
import StickyHeader from "@/components/StickyHeader";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { contextMenuStack } from "@/components/context-menu/ContextMenuItem";
import ActionDivider from "@/components/menu-actions/ActionDivider";
import ActionNewFolder from "@/components/menu-actions/ActionNewFolder";
import { getColor } from "@/theme/colors";
import { alpha, Breakpoint, Button, IconButton, Paper, Skeleton, Stack, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive, ChevronLeft, Clock, CloudUpload, FileDigit, FolderOpen, Funnel, HardDrive, LayoutGrid, Search, StretchHorizontal, } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from "react";
import { File } from "@/entity/File";
import { useCurrentSession } from "@/components/context/CurrentSessionProvider";
import MobileAction from "@/components/MobileAction";
import { FileIcon } from "@untitledui/file-icons";
import { ModuleViewerManager } from "@/viewer/ModuleViewerManager";
import { StickyHeaderManager } from "@/components/StickyHeaderManager";
import { AnimatePresence } from "motion/react";

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

    const router = useRouter();
    const theme = useTheme();
    const { user } = useCurrentSession();
    const [loading, setLoading] = useState(true);
    const [parent, setParent] = useState<File | null>(null);
    const [layout, setLayout] = useLocalStorage<DriveLayoutState["layout"]>("drive-layout", "list");
    const [order, setOrder] = useLocalStorage<DriveLayoutState["order"]>("drive-order", "DESC");
    const [sort, setSort] = useLocalStorage<DriveLayoutState["sort"]>("drive-sort", "type");
    const [keyword, setKeyword] = useState('');
    const [maxWidth, setMaxWidth] = useState<Breakpoint>("lg");

    const state: DriveLayoutState = useMemo(() => ({
        userId: user?.id || '',
        keyword,
        folder: parent, layout, setLayout, order, setOrder, sort, setSort, setParent, setLoading, setMaxWidth
    }), [user, keyword, parent, layout, order, sort, setLayout, setOrder, setSort, setParent, setLoading, maxWidth, setMaxWidth]);

    const toggleLayout = () => setLayout(prev => prev == "grid" ? "list" : "grid");


    const activeStyle = (active: boolean) =>
        active
            ? {
                background: alpha(getColor("primary")[400], 0.3),
                "&:hover": {
                    background: alpha(getColor("primary")[400], 0.3),
                },
            }
            : undefined;
    const menu = contextMenuStack<DriveLayoutState>([
        ActionNewFolder,
        ActionDivider,
        {
            icon: ({ state, size }) =>
                state.layout === "list" ? (
                    <StretchHorizontal size={size} />
                ) : (
                    <LayoutGrid size={size} />
                ),
            label: ({ state }) =>
                `${state.layout === "list" ? "List" : "Grid"} Layout`,
            action({ layout, setLayout }) {
                setLayout(layout === "grid" ? "list" : "grid");
                return false;
            },
        },
        ActionDivider,
        {
            icon: FileDigit,
            label: "Sort by Type",
            style: ({ sort }) => activeStyle(sort === "type"),
            action({ setSort }) {
                setSort("type");
                return false;
            },
        },
        {
            icon: CaseSensitive,
            label: "Sort by Name",
            style: ({ sort }) => activeStyle(sort === "name"),
            action({ setSort }) {
                setSort("name");
                return false;
            },
        },
        {
            icon: Clock,
            label: "Sort by Update Time",
            style: ({ sort }) => activeStyle(sort === "updatedAt"),
            action({ setSort }) {
                setSort("updatedAt");
                return false;
            },
        },
        {
            icon: Clock,
            label: "Sort by Create Time",
            style: ({ sort }) => activeStyle(sort === "createdAt"),
            action({ setSort }) {
                setSort("createdAt");
                return false;
            },
        },
        ActionDivider,
        {
            icon: ({ state, size }) =>
                state.order === "DESC" ? (
                    <ArrowDownWideNarrow size={size} />
                ) : (
                    <ArrowUpNarrowWide size={size} />
                ),
            label: ({ state }) =>
                state.order === "DESC" ? "Order ASC" : "Order DESC",
            action({ setOrder, order }) {
                setOrder(order === "DESC" ? "ASC" : "DESC");
                return false;
            },
        }
    ])

    return (
        <AnimatePresence mode={"wait"}>
            <ModuleViewerManager endpoint="/drive/{ID}">
                <ContextMenu state={state} menu={menu} maxWidth={230}>
                    <Stack flex={1} overflow={"hidden"}>
                        <Container maxWidth={maxWidth} scrollable>
                            <StickyHeaderManager>
                                <StickyHeader loading={loading}>
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent={"space-between"}>
                                        <Stack flex={1} direction={"row"} alignItems={"center"} spacing={1}>
                                            {!loading && !parent ? (
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <HardDrive size={28} color={theme.palette.primary.main} />
                                                    <Typography component={"div"} fontSize={22} fontWeight={700}>
                                                        My Drive
                                                    </Typography>
                                                </Stack>
                                            ) : parent ? (
                                                <Stack direction={"row"} spacing={2} alignItems={"center"}>
                                                    <IconButton onClick={() => router.back()}>
                                                        <ChevronLeft size={16} />
                                                    </IconButton>
                                                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                                        <Stack minWidth={30} justifyContent={"center"} alignItems={"center"}>
                                                            {parent.type == "folder"
                                                                ? <FolderOpen />
                                                                : <FileIcon
                                                                    size={22}
                                                                    variant="solid"
                                                                    // @ts-ignore
                                                                    type={parent.meta.mimeType} />}
                                                        </Stack>
                                                        <Typography component={"div"}>
                                                            {parent.name}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            ) : (
                                                <Stack flex={1} direction={"row"} spacing={1} alignItems={"flex-end"}>
                                                    <Skeleton component={"div"} variant='rounded' width={30} height={30} />
                                                    <Skeleton component={"div"} variant='rounded' width={150} height={20} />
                                                </Stack>
                                            )}
                                        </Stack>

                                        {(parent == null || parent.type == "folder") && (
                                            <Stack direction={"row"} alignItems={"center"} spacing={4}>

                                                <Stack direction={"row"} alignItems={"center"} spacing={1}>
                                                    <MobileAction
                                                        id="search"
                                                        icon={<Search size={18} />}>
                                                        <TextField
                                                            value={keyword}
                                                            onChange={e => setKeyword(e.target.value)}
                                                            autoComplete="off"
                                                            size='small'
                                                            label={`Cari di ${parent ? parent.name : 'Drive'}`}
                                                            fullWidth />
                                                    </MobileAction>

                                                    <MobileAction id="filter">
                                                        <IconButton disabled={loading}>
                                                            <Funnel size={16} />
                                                        </IconButton>
                                                    </MobileAction>
                                                    <MobileAction id="layout">
                                                        <IconButton onClick={toggleLayout}>
                                                            {layout == "grid" ? <LayoutGrid size={16} /> : <StretchHorizontal size={16} />}
                                                        </IconButton>
                                                    </MobileAction>
                                                </Stack>

                                                <Tooltip title={`Unggah file`} arrow>
                                                    <Button
                                                        LinkComponent={Link}
                                                        href={`/drive/upload`}
                                                        variant='contained'
                                                        startIcon={<CloudUpload size={18} />}>
                                                        Unggah
                                                    </Button>
                                                </Tooltip>
                                            </Stack>
                                        )}
                                    </Stack>
                                </StickyHeader>

                                <Paper sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 3, borderRadius: 2, boxShadow: 2, minHeight: 'max(600px, 85vh)' }}>
                                    {children}
                                </Paper>
                            </StickyHeaderManager>
                        </Container>
                    </Stack>
                </ContextMenu>
            </ModuleViewerManager>
        </AnimatePresence>
    );
}