'use client'

import Container from "@/components/Container";
import useLocalStorage from "@/hooks/useLocalstorage";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { contextMenuStack } from "@/components/context-menu/ContextMenuItem";
import ActionDivider from "@/components/menu-actions/ActionDivider";
import ActionNewFolder from "@/components/menu-actions/ActionNewFolder";
import { getColor } from "@/theme/colors";
import { alpha, Paper, Stack, useTheme } from "@mui/material";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive, Clock, FileDigit, LayoutGrid, StretchHorizontal, } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { File, Folder } from "@/entity/File";


export type DriveLayoutState = {
    userId: string;
    file: File | null;
    layout: "grid" | "list";
    setLayout: (l: DriveLayoutState["layout"]) => void;
    order: "ASC" | "DESC";
    setOrder: (s: DriveLayoutState["order"]) => void;
    sort: "type" | "name" | "createdAt" | "updatedAt";
    setSort: (s: DriveLayoutState["sort"]) => void;
    setFolder: (f: Folder | null) => void;
};

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {

    const { uId } = useParams<{ uId: string }>();
    const [file, setFile] = useState<File | null>(null);
    const [layout, setLayout] = useLocalStorage<DriveLayoutState["layout"]>("drive-layout", "list");
    const [order, setOrder] = useLocalStorage<DriveLayoutState["order"]>("drive-order", "DESC");
    const [sort, setSort] = useLocalStorage<DriveLayoutState["sort"]>("drive-sort", "type");

    const state: DriveLayoutState = useMemo(() => ({
        userId: uId,
        file, layout, setLayout, order, setOrder, sort, setSort, setFolder: setFile
    }), [file, layout, setLayout, order, setOrder, sort, setSort, setFile]);

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
        <ContextMenu menu={menu} state={state} maxWidth={210}>
            <Stack flex={1}>
                <Container maxWidth="lg">
                    <Paper component={Stack} sx={{ p: 3, borderRadius: 2, boxShadow: 2, minHeight: 'max(600px, 85vh)' }}>
                        {children}
                    </Paper>
                </Container>
            </Stack>
        </ContextMenu>
    );
}