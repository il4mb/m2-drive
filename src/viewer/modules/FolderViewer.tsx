'use client'

import { ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive, Clock, FileDigit, Folder, LayoutGrid, StretchHorizontal } from "lucide-react"
import { useViewerManager, ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getMany, Query } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { motion } from "motion/react"
import FileView from "@/components/drive/FileView";
import { alpha, IconButton, Stack, TextField } from "@mui/material";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
import { createContextMenu } from "@/components/context-menu/ContextMenuItem";
import useLocalStorage from "@/hooks/useLocalstorage";
import { getColor } from "@/theme/colors";
import { useActionsProvider } from "@/components/navigation/ActionsProvider";

interface CustomFolderViewerComponentProps {
    files?: File[];
    query: Query<'file', 'list'>;
    handleOpen: (file: File) => void;
}

export const CustomFolderViewerComponent = ({ handleOpen, query }: CustomFolderViewerComponentProps) => {
    const [layout, setLayout] = useLocalStorage<string>("drive-layout", "list");
    const [order, setOrder] = useLocalStorage<string>("drive-order", "DESC");
    const [sort, setSort] = useLocalStorage<string>("drive-sort", "type");
    const contextMenu = useContextMenu();
    const [files, setFiles] = useState<File[]>([]);
    const { addAction } = useActionsProvider()!;

    // Memoize context menu state to prevent unnecessary re-renders
    const contextMenuState = useMemo(() => ({
        layout, order, sort,
        setLayout, setOrder, setSort
    }), [layout, order, sort, setLayout, setOrder, setSort]);

    // Memoize active style function
    const activeStyle = useCallback((active: boolean) =>
        active ? {
            background: alpha(getColor("primary")[400], 0.3),
            "&:hover": {
                background: alpha(getColor("primary")[400], 0.3),
            },
        } : undefined,
        []);

    // Memoize context menu items
    const menu = useMemo(() => [
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
    ], [activeStyle]);

    // Add context menu state and menu items
    useEffect(() => {
        const unsubState = contextMenu.addState(contextMenuState);
        const unsubMenu = contextMenu.addMenu("folder-menu", menu);

        return () => {
            unsubState();
            unsubMenu();
        };
    }, [contextMenuState, menu]);

    // Handle query subscription with proper cleanup
    useEffect(() => {
        query.orderBy(sort, (["DESC", "ASC"].includes(order) ? order : undefined) as any);
        const unsubscribe = onSnapshot(query, setFiles);
        return unsubscribe;
    }, [query, order, sort]);

    const handleToggleLayout = useCallback(() => {
        setLayout(prev => prev === "grid" ? "list" : "grid");
    }, [setLayout]);

    // Memoize file view props to prevent unnecessary re-renders
    const fileViewProps = useMemo(() => ({
        size: 22,
        onOpen: handleOpen,
        layout: layout as "grid" | "list",
    }), [handleOpen, layout]);




    useEffect(() => {
        return addAction("layout", {
            position: 2,
            component: (
                <IconButton onClick={handleToggleLayout}>
                    {layout === "grid" ? <LayoutGrid size={18} /> : <StretchHorizontal size={18} />}
                </IconButton>
            ),
            icon: undefined
        })
    }, [layout]);

    useEffect(() => {
        return addAction("search", {
            position: 1,
            component: (
                <TextField size="small" label={"Search..."}/>
            ),
            icon: undefined
        })
    }, [])

    return (
        <>
            <Stack
                key={layout}
                direction={layout === "grid" ? "row" : "column"}
                gap={layout === "grid" ? 3 : 0}
                alignItems={"flex-start"}
                justifyContent={"flex-start"}
                flexWrap={"wrap"}
                p={2}>
                {files?.map((file, index) => (
                    <motion.div
                        key={`${layout}-${file.id}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.02 * index }}
                        style={{
                            maxWidth: layout === "grid" ? '200px' : '100%',
                            width: '100%'
                        }}>
                        <FileView
                            {...fileViewProps}
                            file={file}
                        />
                    </motion.div>
                ))}
            </Stack>
        </>
    );
};

export const FolderViewerComponent: React.FC<{ file: File }> = ({ file }) => {
    const query = useMemo(() => getMany("file").where("pId", "==", file.id), [file.id]);
    const { openWithSupportedViewer } = useViewerManager();

    const handleOpen = useCallback((file: File) => {
        openWithSupportedViewer(file);
    }, [openWithSupportedViewer]);

    return (
        <CustomFolderViewerComponent
            query={query}
            handleOpen={handleOpen}
        />
    );
};

// Memoize the viewer module to prevent re-creation
const FolderViewerModule: ViewerModule = {
    priority: 10,
    id: 'folder',
    name: "Folder",
    icon: <Folder size={18} />,
    supports: (_, file) => file.type === "folder",
    component: FolderViewerComponent
};

export default FolderViewerModule;