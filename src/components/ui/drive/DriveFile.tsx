"use client"

import { Box, ListItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { Folder } from 'lucide-react';
import { useDriveRoot } from './DriveRoot';
import { motion } from 'motion/react';
import { IDriveFile } from '@/entity/DriveFile';
import { useEffect, useState } from 'react';
import ContextMenu from './ContextMenu';
import usePresignUrl from '@/components/hooks/usePresignUrl';

export interface DriveFileProps {
    file: IDriveFile;
    index: number;
}

export default function DriveFile({ file, index }: DriveFileProps) {

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const { select, selected, setFolder } = useDriveRoot();
    const active = selected == file;

    const handleClick = () => {
        select(file);
    }

    const handleDoubleClick = () => {
        if (file.type == "folder") {
            setFolder(file);
        }
    }


    const handleMouseUp = (e: React.MouseEvent) => {
        if (e.button === 2) {
            console.log("Right click via mouseup:", e.clientX, e.clientY);
            // Bisa dipakai untuk logging atau highlight
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); // blokir menu default browser
        e.stopPropagation();

        console.log("Override context menu!", e.clientX, e.clientY);
        // custom logic: misal buka custom menu
        setContextMenu({ x: e.clientX, y: e.clientY });
    };


    return (
        <>
            <ListItem
                component={motion.div}
                layoutId={file.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                sx={{ cursor: 'pointer', bgcolor: active ? 'action.hover' : '' }}>
                <ListItemIcon>
                    {file.type == "folder"
                        ? <Folder strokeWidth={1} />
                        : <FileIcon variant='default' size={22} type={file.meta?.mimeType || file.type} />
                    }
                </ListItemIcon>
                <Stack direction={"row"} flex={1}>
                    <Box flex={1}>
                        <ListItemText sx={{ ml: 1, flex: 1, userSelect: 'none' }}>
                            {file.name}
                        </ListItemText>
                    </Box>
                    <Stack direction={"row"} spacing={-1}>

                    </Stack>
                </Stack>
            </ListItem>
            <ContextMenu
                position={contextMenu}
                file={file}
                onClose={() => setContextMenu(null)} />
        </>
    );
}
