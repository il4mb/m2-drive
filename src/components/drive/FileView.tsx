'use client'

import { File } from '@/entities/File';
import { formatFileSize, formatNumber } from '@/libs/utils';
import { alpha, Avatar, Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
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
import ActionLabel from '../menu-actions/ActionLabel';
import FileViewIcon from './FileViewIcon';
import { getColor } from '@/theme/colors';

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
        ActionLabel,
        ActionTrash,
    });

    const viewers = useFileViewersByFile(file.id);

    return (
        <ContextMenu state={menuState} menu={customMenu || menuItem} maxWidth={230} onContextMenu={handleClick}>
            <Stack
                component={Paper}
                direction={layout == "list" ? "row" : "column"}
                alignItems={"center"}
                onDoubleClick={handleOpen}
                onClick={handleClick}
                sx={{
                    px: layout == "list" ? 2 : 0,
                    py: layout == "list" ? 1 : 0,
                    mb:  layout == "list" ? 1 : 0,
                    position: 'relative',
                    cursor: 'pointer',
                    userSelect: 'none',
                    outline: '2px solid',
                    outlineColor: selected ? `${getColor('primary')[400]}` : 'transparent',
                    boxShadow: layout == "grid" ? 2 : 0,
                    outlineRadius: layout == "grid" ? 2 : 0,
                    overflow: "hidden",
                    background: 'transparent',
                    backdropFilter: 'blur(10px)',
                    transition: 'all .2s ease',
                    "&:hover": {
                        bgcolor: "action.hover",
                        outlineColor: selected ? `${getColor('primary')[400]}` : `${alpha(getColor('primary')[400], 0.5)}`,
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
                                    <FileViewIcon file={file} size={45} showDocumentPreview />
                                )}
                            </Stack>
                            <Stack justifyContent={"center"} alignItems={"center"} position={"relative"} zIndex={100}>
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
                                        wordBreak: 'break-word',
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

                            </Stack>
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
                        <Stack direction={"row"} alignItems={"center"} flexWrap={"wrap"} flex={1} gap={{ xs: 0, md: 2 }}>
                            <Stack
                                direction={"row"}
                                spacing={1}
                                flexBasis={400}
                                alignItems={"center"}>
                                <Box sx={{ mr: 1 }}>
                                    <FileViewIcon file={file} size={size} />
                                </Box>
                                <Typography
                                    fontSize={size - ((40 / 100) * size)}
                                    sx={{
                                        display: "-webkit-box",
                                        overflow: "hidden",
                                        WebkitBoxOrient: "vertical",
                                        WebkitLineClamp: 2, // Max 2 lines
                                        lineHeight: "1.2em",
                                        wordBreak: 'break-word',
                                    }}>
                                    {file.name}
                                </Typography>
                            </Stack>

                            <Typography flexBasis={200} variant={'caption'} color='text.secondary'>
                                {file.type == "folder"
                                    // @ts-ignore
                                    ? `${file.meta?.itemCount || 0} items`
                                    // @ts-ignore
                                    : formatFileSize(file.meta?.size || 0)}
                            </Typography>

                            {contributors.length > 0 && (
                                <Stack
                                    direction={"row"}
                                    ml={{ xs: "auto", md: 5 }}
                                    alignItems={"center"}>
                                    <Typography>Dibagikan:</Typography>
                                    <Stack direction={"row"} alignItems={"center"} ml={2}>
                                        {contributors.slice(0, 3).map((c, i) => (
                                            <UserAvatar
                                                key={i}
                                                userId={c.user.id}
                                                size={18}
                                                sx={{ ml: -1 }}
                                            />
                                        ))}
                                        {contributors.length > 3 && (
                                            <Avatar sx={{ ml: -1, width: 20, height: 20, fontSize: '0.7em' }}>
                                                +{formatNumber(contributors.length - 3, 9)}
                                            </Avatar>
                                        )}
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
                        </Stack>
                    )}
            </Stack>
        </ContextMenu>
    );
}