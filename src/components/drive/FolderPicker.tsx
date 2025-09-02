'use client'

import { File } from '@/entity/File';
import useUserDrive from '@/hooks/useDrive';
import { getColor } from '@/theme/colors';
import { Breadcrumbs, List, ListItem, ListItemIcon, ListItemText, Stack, Typography, CircularProgress, Box, Paper, } from '@mui/material';
import { Folder, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface FolderPickerProps {
    onSelectedChange?: (file: File | null) => void;
    disabled?: boolean | string[];
    userId: string;
}


export default function FolderPicker({ onSelectedChange, disabled, userId }: FolderPickerProps) {

    const [openedFolders, setOpenedFolders] = useState<File[]>([]);
    const [selected, setSelected] = useState<File | null>(null);
    const [folder, setFolder] = useState<File | null>(null);
    const locked = useRef(false);

    const driveProps = useMemo<any>(() => ({
        uId: userId,
        pId: folder?.id,
        filter: {
            onlyType: "folder",
            order: 'DESC',
            sortBy: 'createdAt'
        }
    }), [userId, folder])

    const { files = [], loading } = useUserDrive(driveProps);

    const handleSelected = (file: File) => {
        if (locked.current) return;
        setSelected(file);
        onSelectedChange?.(file);
    }

    const handleOpenFolder = (file: File | null) => {
        if (locked.current) return;
        locked.current = true;
        if (!file) {
            setFolder(null);
            setOpenedFolders([]);
            onSelectedChange?.(null);
            setSelected(null);
            return;
        }
        if (selected == file) {
            setSelected(null);
        }
        setFolder(file);
        setOpenedFolders((prev) => [...prev, file]);
        onSelectedChange?.(file);
    }

    useEffect(() => {
        locked.current = false;
    }, [files])

    return (
        <Stack spacing={2} flex={1} overflow={"hidden"} height={300}>

            {/* Breadcrumbs */}
            <Breadcrumbs separator={<ChevronRight size={14} strokeWidth={2} />}>
                <Typography
                    onClick={() => handleOpenFolder(null)}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                    color="primary">
                    My Drive
                </Typography>
                {openedFolders.map((f, i) => (
                    <Typography
                        key={i}
                        onClick={() => {
                            // Navigate back to this folder
                            setFolder(f);
                            setOpenedFolders((prev) => prev.slice(0, i + 1));
                        }}
                        sx={{ cursor: 'pointer' }}
                        color="text.secondary">
                        {f.name}
                    </Typography>
                ))}
                {selected && (
                    <Typography
                        sx={{ cursor: 'pointer' }}
                        color="text.secondary">
                        {selected.name}
                    </Typography>
                )}
            </Breadcrumbs>

            {/* File List */}
            <Stack
                component={Paper}
                flex={1}
                borderRadius={2}
                overflow={'hidden'}>

                {loading ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        height={200}
                        spacing={1}>
                        <CircularProgress size={28} />
                        <Typography variant="body2" color="text.secondary">
                            Loading folders...
                        </Typography>
                    </Stack>
                ) : files.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        height={200}
                        spacing={1}>
                        <Folder size={28} />
                        <Typography variant="body2" color="text.secondary">
                            No folders found
                        </Typography>
                    </Stack>
                ) : (
                    <List sx={{ p: 0, overflow: 'auto' }}>
                        {files.map((file, i) => {
                            const active = file.id === selected?.id;
                            const disable = Array.isArray(disabled) ? disabled.includes(file.id) : disabled;
                            return (
                                <ListItem
                                    key={file.id}
                                    onClick={() => !disable && handleSelected(file)}
                                    onDoubleClick={() => !disable && handleOpenFolder(file)}
                                    sx={{
                                        cursor: 'pointer',
                                        px: 2,
                                        py: 1,
                                        opacity: disable ? 0.5 : 1,
                                        bgcolor: disable
                                            ? 'action.hover'
                                            : active
                                                ? getColor('primary')[100]
                                                : 'background.paper',
                                        '&:hover': {
                                            bgcolor: !disable && active
                                                ? getColor('primary')[200]
                                                : 'action.hover',
                                        },
                                        transition: 'all 0.15s ease',
                                    }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <Folder
                                            size={18}
                                            color={
                                                active
                                                    ? getColor('primary')[600]
                                                    : getColor('secondary')[600]
                                            }
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        sx={{ userSelect: 'none' }}
                                        slotProps={{
                                            primary: {
                                                fontSize: 14,
                                                fontWeight: active ? 600 : 400,
                                                color: active ? 'primary.main' : 'text.primary',
                                            }
                                        }}>
                                        {file.name}
                                    </ListItemText>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </Stack>
        </Stack>
    );
}
