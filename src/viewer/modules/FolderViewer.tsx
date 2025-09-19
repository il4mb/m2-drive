'use client'

import { ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive, Clock, FileDigit, Folder, LayoutGrid, StretchHorizontal, TriangleAlert } from "lucide-react"
import { useViewerManager, ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entities/File";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getMany, IsNull, Json, Query } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { motion } from "motion/react"
import FileView from "@/components/drive/FileView";
import { alpha, Box, CircularProgress, IconButton, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
import { createContextMenu } from "@/components/context-menu/ContextMenuItem";
import useLocalStorage from "@/hooks/useLocalstorage";
import { getColor } from "@/theme/colors";
import { useActionsProvider } from "@/components/navigation/ActionsProvider";
import ActionNewFolder from "@/components/menu-actions/ActionNewFolder";

interface CustomFolderViewerComponentProps {
    files?: File[];
    query: Query<'file', 'list'>;
    handleOpen: (file: File) => void;
}

export const CustomFolderViewerComponent = ({ handleOpen, query: initialQuery }: CustomFolderViewerComponentProps) => {

    const [keyword, setKeyword] = useState('');
    const [layout, setLayout] = useLocalStorage<string>("drive-layout", "list");
    const [order, setOrder] = useLocalStorage<string>("drive-order", "DESC");
    const [sort, setSort] = useLocalStorage<string>("drive-sort", "type");
    const contextMenu = useContextMenu();
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addAction, updateActionProps } = useActionsProvider()!;

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
    const menu = useMemo(() => ([
        ActionNewFolder,
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
    ]), [activeStyle]);

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
        if (isLoading) return;
        setIsLoading(true);
        const query = Query.createFrom(initialQuery)

        query.bracketWhere((q) => {
            q.where(Json('meta', 'trashed'), 'IS NULL')
                .orWhere(Json('meta', 'trashed'), '==', false)
        })
        query.orderBy(sort, (["DESC", "ASC"].includes(order) ? order : undefined) as any);
        if (keyword.length > 0) {
            query.where("name", "STARTS WITH", keyword);
        }

        const unsubscribe = onSnapshot(query, (data) => {
            setTimeout(() => {
                setFiles(data.rows);
                setIsLoading(false);
            }, 250);
        });

        return unsubscribe;
    }, [initialQuery, order, sort, keyword]);

    const handleToggleLayout = useCallback(() => {
        setLayout(prev => prev === "grid" ? "list" : "grid");
    }, [setLayout]);

    // Memoize file view props to prevent unnecessary re-renders
    const fileViewProps = useMemo(() => ({
        size: 22,
        onOpen: handleOpen,
        layout: layout as "grid" | "list",
    }), [handleOpen, layout]);

    // add action menu
    useEffect(() => {
        const removers = [
            addAction("search", {
                position: 1,
                component: ({ value, onChange }) => (<TextField label="Search..." size="small" value={value} onChange={e => onChange(e.target.value)} />),
                componentProps: {
                    value: keyword,
                    onChange: setKeyword
                },
                icon: undefined
            }),
            addAction("layout", {
                position: 2,
                component: ({ layout }) => (
                    <IconButton onClick={handleToggleLayout}>
                        {layout === "grid" ? <LayoutGrid size={18} /> : <StretchHorizontal size={18} />}
                    </IconButton>
                ),
                icon: undefined
            })
        ]
        return () => {
            removers.map(e => e());
        }
    }, [initialQuery]);
    // update action menu
    useEffect(() => {
        updateActionProps("search", { value: keyword });
        updateActionProps("layout", { layout });
    }, [updateActionProps, keyword, layout]);

    return (
        <>
            {/* Loading Indicator */}
            {isLoading && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                    }}>
                    <LinearProgress
                        sx={{
                            height: 2,
                            backgroundColor: 'transparent',
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: getColor("primary")[400],
                            }
                        }}
                    />
                </Box>
            )}

            {isLoading ? (
                <Stack flex={1} justifyContent={"center"} alignItems={"center"} color="text.secondary">
                    <CircularProgress />
                    <Typography color="text.secondary">Loading...</Typography>
                </Stack >
            ) : files?.length == 0 ? (
                <Stack flex={1} justifyContent={"center"} alignItems={"center"} color="text.secondary">
                    <TriangleAlert size={33} />
                    <Typography fontSize={18} fontWeight={600} color="text.secondary">Folder ini kosong!</Typography>
                </Stack>
            ) : (
                <Stack
                    key={layout}
                    direction={layout === "grid" ? "row" : "column"}
                    gap={layout === "grid" ? 3 : 0}
                    alignItems={"flex-start"}
                    justifyContent={"flex-start"}
                    flexWrap={"wrap"}
                    p={2}
                    sx={{
                        position: 'relative',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'opacity 0.2s ease-in-out'
                    }}>
                    {files?.map((file, index) => (
                        <Box component={motion.div}
                            key={`${layout}-${file.id}`}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.02 * index }}
                            sx={{
                                maxWidth: layout === "grid" ? {
                                    xs: '180px',
                                    md: '200px'
                                } : '100%',
                                width: layout === "grid" ? {
                                    xs: '46%',
                                    md: '100%'
                                } : '100%'
                            }}>
                            <FileView
                                {...fileViewProps}
                                file={file}
                            />
                        </Box>
                    ))}

                </Stack>
            )}
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