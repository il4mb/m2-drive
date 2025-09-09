'use client'

import { File } from '@/entities/File';
import { formatFileSize } from '@/libs/utils';
import { Avatar, Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { Folder } from 'lucide-react';
import { FC, MouseEvent } from 'react';
import ContextMenu from '../context-menu/ContextMenu';
import { ContextMenuItemProps, contextMenuStack } from '../context-menu/ContextMenuItem';
import ActionOpen from '../menu-actions/ActionOpen';
import ActionShare from '../menu-actions/ActionShare';
import { useContributors } from '@/hooks/useContributors';
import ActionCopy from '../menu-actions/ActionCopy';
import ActionMove from '../menu-actions/ActionMove';
import ActionRename from '../menu-actions/ActionRename';
import ActionTrash from '../menu-actions/ActionTrash';
import UserAvatar from '../ui/UserAvatar';
import ActionDetails from '../menu-actions/ActionDetails';
import ActionOpenWith from '../menu-actions/ActionOpenWith';
import { useFileViewersByFile } from '../file-viewers/FileViewersProvider';

export type FileMenuState = {
    file: File;
    onOpen?: (f: File) => void;
}

export interface FileViewProps<T = {}> {
    file: File;
    onOpen?: (file: File) => void;
    onSelect?: (file: File) => void;
    size?: number;
    selected?: boolean;
    layout?: "list" | "grid";
    menu?: Record<string, FC<ContextMenuItemProps<FileMenuState>>>,
    appendMenu?: Record<string, FC<ContextMenuItemProps<FileMenuState>>>,
    menuState?: T
}
export default function FileView<T = any>({
    file,
    onOpen,
    onSelect,
    size = 18,
    selected = false,
    layout = "list",
    menu: customMenu,
    menuState: additionalMenuState
}: FileViewProps<T>) {

    const { contributors } = useContributors(file.id);

    const handleOpen = (e: MouseEvent) => {
        e.preventDefault();
        onOpen?.(file);
    }

    const handleClick = () => {
        onSelect?.(file);
    }

    const menuState: FileMenuState & T = {
        file,
        onOpen(f: any) {
            onOpen?.(f);
        },
        ...additionalMenuState
    } as any;

    const menuItem = contextMenuStack<FileMenuState>({
        ActionOpen,
        ActionOpenWith,
        ActionDetails,
        ActionShare,
        ActionCopy,
        ActionMove,
        ActionRename,
        ActionTrash,
    });

    const viewers = useFileViewersByFile(file.id);

    return (
        <ContextMenu state={menuState} menu={customMenu || menuItem} maxWidth={230}>
            <Stack
                component={Paper}
                direction={layout == "list" ? "row" : "column"}
                alignItems={"center"}
                onDoubleClick={handleOpen}
                onClick={handleClick}
                sx={{
                    px: layout == "list" ? 2 : 0,
                    py: layout == "list" ? 1 : 0,
                    position: 'relative',
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: selected ? "action.hover" : '',
                    boxShadow: layout == "grid" ? 2 : 0,
                    borderRadius: layout == "grid" ? 2 : 0,
                    // overflow: 'hidden',
                    "&:hover": {
                        bgcolor: "action.hover"
                    },
                    // @ts-ignore
                    ...(layout == "grid" && file.meta?.thumbnail && {
                        // @ts-ignore
                        background: `url(/s3/${file.meta?.thumbnail})`
                    })
                }}>
                {layout == "grid"
                    ? (
                        <Stack
                            flexBasis={150}
                            justifyContent={"center"}
                            alignItems={"center"}
                            overflow={"hidden"}>
                            <Stack
                                flex={1}
                                justifyContent={"center"}
                                alignItems={"center"}>
                                {!Boolean((file.meta as any)?.thumbnail) && (
                                    <>
                                        {file.type == "folder"
                                            ? <Folder
                                                strokeWidth={1}
                                                size={size * 2} />
                                            : <FileIcon
                                                variant={"solid"}
                                                size={size * 2}
                                                // @ts-ignore
                                                type={file.meta?.mimeType || ''} />}
                                    </>
                                )}

                            </Stack>
                            <Typography
                                maxWidth="150px"
                                fontSize={size - ((40 / 100) * size)}
                                textAlign="center"
                                sx={{
                                    display: "-webkit-box",
                                    overflow: "hidden",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 2, // Max 2 lines
                                    lineHeight: "1.2em",
                                }}>
                                {file.name}
                            </Typography>

                            <Typography color='text.secondary' fontSize={10} textAlign={"center"} mb={0.4}>
                                {file.type == "folder"
                                    // @ts-ignore
                                    ? `${file.meta?.itemCount || 0} items`
                                    // @ts-ignore
                                    : formatFileSize(file.meta?.size || 0)}
                            </Typography>

                            <Box sx={{ position: 'absolute', top: 0, right: 0, m: 1 }}>
                                {viewers.length > 0 && (
                                    <Stack direction={'row'} alignItems={"center"} ml={"auto"}>
                                        {viewers.map((p, i) => (
                                            <Tooltip
                                                title={`${p.displayName || "Unknown"}${p.isGuest ? " (tamu)" : ""}`}
                                                key={p.uid || i}
                                                arrow>
                                                <Avatar
                                                    sx={{ width: 18, height: 18, ml: -1, fontSize: 12 }}
                                                    src={p.avatar}>
                                                    {p.isGuest ? "?" : `${p.displayName || "Unknown"}`.substring(1, -1)}
                                                </Avatar>
                                            </Tooltip>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    ) : (
                        <>
                            <Stack direction={"row"} spacing={1} flexBasis={400} alignItems={"center"}>
                                <Box sx={{ mr: 1 }}>
                                    {file.type == "folder"
                                        ? <Folder
                                            size={size} />
                                        : <FileIcon
                                            variant={"solid"} size={size}
                                            // @ts-ignore   
                                            type={file.meta?.mimeType || ''} />}
                                </Box>
                                <Typography fontSize={size - ((40 / 100) * size)}>
                                    {file.name}
                                </Typography>
                            </Stack>

                            <Typography flexBasis={200}>
                                {file.type == "folder"
                                    // @ts-ignore
                                    ? `${file.meta?.itemCount || 0} items`
                                    // @ts-ignore
                                    : formatFileSize(file.meta?.size || 0)}
                            </Typography>

                            {contributors.length > 0 && (
                                <Stack
                                    direction={"row"}
                                    ml={5}
                                    alignItems={"center"}>
                                    <Typography>
                                        Dibagikan:
                                    </Typography>
                                    <Stack
                                        direction={"row"}
                                        alignItems={"center"}
                                        ml={1}>
                                        {contributors.map((c, i) => (
                                            <UserAvatar
                                                key={i}
                                                userId={c.user.id}
                                                size={18} />
                                        ))}
                                    </Stack>
                                </Stack>
                            )}


                            {viewers.length > 0 && (
                                <Stack direction={'row'} alignItems={"center"} ml={"auto"}>
                                    {viewers.map((p, i) => (
                                        <Tooltip title={`${p.displayName || "Unknown"}${p.isGuest ? " (tamu)" : ""}`} key={p.uid || i} arrow>
                                            <Avatar sx={{ width: 18, height: 18, ml: -1, fontSize: 12 }} src={p.avatar}>
                                                {p.isGuest ? "?" : `${p.displayName || "Unknown"}`.substring(1, -1)}
                                            </Avatar>
                                        </Tooltip>
                                    ))}
                                </Stack>
                            )}
                        </>
                    )}
            </Stack>
        </ContextMenu>
    );
}