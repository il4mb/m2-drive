'use client'

import Container from "@/components/Container";
import useLocalStorage from "@/hooks/useLocalstorage";
import StickyHeader from "@/components/StickyHeader";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { contextMenuStack } from "@/components/context-menu/ContextMenuItem";
import ActionDivider from "@/components/menu-actions/ActionDivider";
import ActionNewFolder from "@/components/menu-actions/ActionNewFolder";
import { getColor } from "@/theme/colors";
import { alpha, Button, IconButton, Paper, Skeleton, Stack, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive, ChevronLeft, Clock, CloudUpload, FileDigit, FolderOpen, Funnel, HardDrive, LayoutGrid, StretchHorizontal, } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { File, Folder } from "@/entity/File";

export type DriveLayoutState = {
    file: File | null;
    layout: "grid" | "list";
    setLayout: (l: DriveLayoutState["layout"]) => void;
    order: "asc" | "desc";
    setOrder: (s: DriveLayoutState["order"]) => void;
    sort: "type" | "name" | "createdAt" | "updatedAt";
    setSort: (s: DriveLayoutState["sort"]) => void;
    setFolder: (f: Folder | null) => void;
    setLoading: (b: boolean) => void;
};



export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {

    const router = useRouter();
    const theme = useTheme();

    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [layout, setLayout] = useLocalStorage<DriveLayoutState["layout"]>("drive-layout", "list");
    const [order, setOrder] = useLocalStorage<DriveLayoutState["order"]>("drive-order", "desc");
    const [sort, setSort] = useLocalStorage<DriveLayoutState["sort"]>("drive-sort", "type");

    const state: DriveLayoutState = useMemo(() => ({
        file, layout, setLayout, order, setOrder, sort, setSort, setFolder: setFile, setLoading
    }), [file, layout, setLayout, order, setOrder, sort, setSort, setFile, setLoading]);

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
                state.order === "desc" ? (
                    <ArrowDownWideNarrow size={size} />
                ) : (
                    <ArrowUpNarrowWide size={size} />
                ),
            label: ({ state }) =>
                state.order === "desc" ? "Order ASC" : "Order DESC",
            action({ setOrder, order }) {
                setOrder(order === "desc" ? "asc" : "desc");
                return false;
            },
        }
    ])

    return (
        <ContextMenu state={state} menu={menu} maxWidth={210}>
            <Stack flex={1} overflow={"hidden"}>
                <Container maxWidth='lg' scrollable>
                    {/* Sticky Header */}
                    <StickyHeader>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent={"space-between"}>
                            <Stack flex={1} direction={"row"} alignItems={"center"} spacing={1}>
                                {!loading && !file ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <HardDrive size={28} color={theme.palette.primary.main} />
                                        <Typography component={"div"} fontSize={22} fontWeight={700}>
                                            My Drive
                                        </Typography>
                                    </Stack>
                                ) : file ? (
                                    <Stack direction={"row"} spacing={2} alignItems={"center"}>
                                        <IconButton onClick={() => router.back()}>
                                            <ChevronLeft size={16} />
                                        </IconButton>
                                        <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                            <FolderOpen />
                                            <Typography component={"div"}>
                                                {file.name}
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

                            <Stack direction={"row"} alignItems={"center"} spacing={4}>

                                <Stack direction={"row"} alignItems={"center"} spacing={1}>
                                    <TextField
                                        autoComplete="off"
                                        disabled={loading}
                                        size='small'
                                        label={`Cari di ${file ? file.name : 'Drive'}`}
                                        fullWidth />
                                    <IconButton disabled={loading}>
                                        <Funnel size={16} />
                                    </IconButton>
                                    <IconButton onClick={toggleLayout}>
                                        {layout == "grid" ? <LayoutGrid size={16} /> : <StretchHorizontal size={16} />}
                                    </IconButton>
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
                        </Stack>
                    </StickyHeader>

                    <Paper sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 3, borderRadius: 2, boxShadow: 2, minHeight: '85dvh' }}>
                        {children}
                    </Paper>
                </Container>
            </Stack>
        </ContextMenu>
    );
}