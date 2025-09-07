'use client'

import { ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive, Clock, FileDigit, Folder, LayoutGrid, StretchHorizontal } from "lucide-react"
import { useViewerManager, ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useMemo, useState } from "react";
import { getMany, Query } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { motion } from "motion/react"
import FileView from "@/components/drive/FileView";
import { alpha, IconButton, Stack, TextField } from "@mui/material";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
import { createContextMenu } from "@/components/context-menu/ContextMenuItem";
import useLocalStorage from "@/hooks/useLocalstorage";
import { getColor } from "@/theme/colors";
import MobileAction from "@/components/navigation/MobileAction";

type CustonFolderViewerComponentProps = {
    files?: File[];
    query: Query<'file', 'list'>;
    handleOpen: (file: File) => void;
}
export const CustomFolderViewerComponent = ({ handleOpen, query }: CustonFolderViewerComponentProps) => {

    const [layout, setLayout] = useLocalStorage<string>("drive-layout", "list");
    const [order, setOrder] = useLocalStorage<string>("drive-order", "DESC");
    const [sort, setSort] = useLocalStorage<string>("drive-sort", "type");

    const contextMenu = useContextMenu();
    const [files, setFiles] = useState<File[]>([]);

    const activeStyle = (active: boolean) =>
        active
            ? {
                background: alpha(getColor("primary")[400], 0.3),
                "&:hover": {
                    background: alpha(getColor("primary")[400], 0.3),
                },
            }
            : undefined;

    const menu = useMemo<ReturnType<typeof createContextMenu>[]>(() => [
        createContextMenu({
            icon: ({ state, size }) =>
                state.layout === "list" ? (
                    <StretchHorizontal size={size} />
                ) : (
                    <LayoutGrid size={size} />
                ),
            label: ({ state }) => `${state.layout === "list" ? "List" : "Grid"} Layout`,
            action({ setLayout, layout }) {
                setLayout(layout === "grid" ? "list" : "grid");
                return false;
            },
        }),
        createContextMenu({
            icon: FileDigit,
            label: "Sort by Type",
            style: ({ sort }) => activeStyle(sort === "type"),
            action({ setSort }) {
                setSort("type");
                return false;
            },
        }),
        createContextMenu({
            icon: CaseSensitive,
            label: "Sort by Name",
            style: ({ sort }) => activeStyle(sort === "name"),
            action({ setSort }) {
                setSort("name");
                return false;
            },
        }),
        createContextMenu({
            icon: Clock,
            label: "Sort by Update Time",
            style: ({ sort }) => activeStyle(sort === "updatedAt"),
            action({ setSort }) {
                setSort("updatedAt");
                return false;
            },
        }),
        createContextMenu({
            icon: Clock,
            label: "Sort by Create Time",
            style: ({ sort }) => activeStyle(sort === "createdAt"),
            action({ setSort }) {
                setSort("createdAt");
                return false;
            },
        }),
        createContextMenu({
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
        })
    ], []);

    useEffect(() => {
        contextMenu.addState({
            layout, order, sort,
            setLayout, setOrder, setSort
        });
    }, [layout, order, sort, setLayout, setOrder, setSort]);

    useEffect(() => {
        return contextMenu.addMenu("folder-menu", menu);
    }, []);

    useEffect(() => {
        query.orderBy(sort, (["DESC", "ASC"].includes(order) ? order : undefined) as any);
        const unsubscribe = onSnapshot(query, (data) => {
            setFiles(data);
        })
        return unsubscribe;
    }, [query, order, sort]);


    const handleToggleLayout = () => setLayout(prev => prev == "grid" ? "list" : "grid");

    return (
        <>
            <MobileAction id="search">
                <TextField size="small" label={"Search"} />
            </MobileAction>
            <MobileAction id="layout">
                <IconButton onClick={handleToggleLayout}>
                    {layout == "grid" ? <LayoutGrid size={18} /> : <StretchHorizontal size={18} />}
                </IconButton>
            </MobileAction>
            <Stack
                key={layout}
                direction={layout == "grid" ? "row" : "column"}
                gap={layout == "grid" ? 3 : 0}
                alignItems={"flex-start"}
                justifyContent={"flex-start"}
                flexWrap={"wrap"}
                p={2}>
                {files?.map((file, i) => (
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                            delay: 0.02 * i
                        }}
                        style={{
                            maxWidth: layout == "grid" ? '200px' : '100%',
                            width: '100%'
                        }}
                        key={`${layout}-${file.id}`}>
                        <FileView
                            size={22}
                            onOpen={handleOpen}
                            layout={layout as any}
                            file={file}
                        />
                    </motion.div>
                ))}
            </Stack>
        </>
    )
}

export const FolderViewerComponent: React.FC<{ file: File }> = ({ file }) => {

    const query = useMemo(() => getMany("file").where("pId", "==", file.id), [file])
    const { openWithSupportedViewer } = useViewerManager();
    const handleOpen = (file: File) => {
        openWithSupportedViewer(file);
    }

    return (
        <CustomFolderViewerComponent
            query={query}
            handleOpen={handleOpen} />
    )
}

export default {
    priority: 10,
    id: 'folder',
    name: "Folder",
    icon: <Folder size={18} />,
    supports: (_, file) => file.type == "folder",
    component: FolderViewerComponent
} as ViewerModule;