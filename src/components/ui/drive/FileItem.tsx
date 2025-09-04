"use client"

import usePresignUrl from '@/hooks/usePresignUrl';
import { File } from '@/entity/File';
import { Avatar, Stack, Typography } from '@mui/material';
import { FileImage, Folder } from 'lucide-react';
import ContextMenu from '../../context-menu/ContextMenu';
import { FileIcon } from '@untitledui/file-icons';
import { ContextMenuItemProps } from '../../context-menu/ContextMenuItem';
import { motion } from 'motion/react';
import { formatLocaleDate } from '@/libs/utils';


export type FileContextMenu = {
    file: File;
    refresh: () => void;
    onOpen?: (file: File) => void;
}

export interface FileItemProps {
    file: File;
    layout?: "list" | "grid";
    index?: number;
    menu?: React.FC<ContextMenuItemProps<FileContextMenu>>[];
    onOpen?: (file: File) => void;
    onRefresh?: () => void;
}
export default function FileItem({ index = 0, file, menu = [], layout = "grid", onOpen, onRefresh }: FileItemProps) {

    const mimeType = file.meta?.mimeType;
    const isImage = mimeType?.startsWith("image");
    const isFolder = file.type == "folder";

    const refresh = () => {
        onRefresh?.();
    }

    return (
        <ContextMenu
            menu={menu}
            state={{ refresh, onOpen, file }}
            highlight>
            <Stack
                component={motion.div}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ delay: 0.01 * index }}
                onDoubleClick={() => onOpen?.(file)}
                padding={4}
                direction={layout == "grid" ? "column" : "row"}
                sx={{
                    maxWidth: layout == "grid" ? 180 : "none",
                    width: '100%',
                    userSelect: "none",
                    borderRadius: 2
                }}
                spacing={1}
                px={2}
                py={layout == "list" ? 1.4 : 2}>
                <Stack
                    direction={layout == "list" ? "row" : "column"}
                    justifyContent={layout == "list" ? "flex-start" : "center"}
                    alignItems={"center"}
                    flexBasis={layout == "list" ? 480 : 80}
                    spacing={1}>
                    <Stack>
                        {isImage
                            ? <FileMedia file={file} />
                            : isFolder
                                ? <Folder size={24} />
                                : <FileIcon size={24} type={mimeType || file.type} />}
                    </Stack>
                    <Typography>{file.name}</Typography>
                </Stack>
                {layout == "list" && (
                    <Stack flex={1}>
                        {file.meta?.lastOpen && (
                            <Typography>
                                {formatLocaleDate(file.meta.lastOpen, 'ID-id')}
                            </Typography>
                        )}
                    </Stack>
                )}
            </Stack>
        </ContextMenu>
    );
}

const FileMedia = ({ file }: { file: any }) => {
    const presignUrl = usePresignUrl(file);
    return (
        <Avatar src={presignUrl} variant='square' sx={{ width: 24, height: 24, borderRadius: 0.5 }}>
            <FileImage />
        </Avatar>
    )
}