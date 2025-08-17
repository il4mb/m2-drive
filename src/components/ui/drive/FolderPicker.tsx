'use client'

import { useActionPending } from '@/components/hooks/useActionPending';
import { DriveFile, IDriveFile } from '@/entity/DriveFile';
import { getColor } from '@/theme/colors';
import {
    Breadcrumbs,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
    CircularProgress,
    Box,
} from '@mui/material';
import { Folder, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface FolderPickerProps {
    onSelectedChange?: (file: DriveFile | null) => void;
}

export default function FolderPicker({ onSelectedChange }: FolderPickerProps) {

    const [openedFolders, setOpenedFolders] = useState<IDriveFile[]>([]);
    const [selected, setSelected] = useState<DriveFile | null>(null);
    const [files, setFiles] = useState<IDriveFile[]>([]);
    const [folder, setFolder] = useState<IDriveFile | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const [loading, fetchFiles] = useActionPending(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const searchParams = new URLSearchParams({ type: 'folder' });
            if (folder) searchParams.set('fId', folder.id);

            const response = await fetch(`/api/drive?${searchParams}`, {
                signal: controller.signal,
            }).then((e) => e.json());

            if (!response.status) throw new Error(response.message);
            setFiles(response.data);
        } catch (e: any) {
            console.error(e);
        }
    });

    const handleSelected = (file: DriveFile) => {
        setSelected(file);
        onSelectedChange?.(file);
    }

    const handleOpenFolder = (file: DriveFile | null) => {
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
        fetchFiles();
        return () => abortRef.current?.abort();
    }, [folder?.id]);

    return (
        <Stack spacing={2}>

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
            <Box
                sx={{
                    // border: (theme) => `1px solid #aaa8`,
                    borderRadius: 2,
                    overflow: 'hidden',
                }}>
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
                    <List sx={{ p: 0 }}>
                        {files.map((file, i) => {
                            const active = file.id === selected?.id;
                            return (
                                <ListItem
                                    key={file.id}
                                    onClick={() => handleSelected(file)}
                                    onDoubleClick={() => handleOpenFolder(file)}
                                    sx={{
                                        cursor: 'pointer',
                                        px: 2,
                                        py: 1,
                                        bgcolor: active
                                            ? getColor('primary')[100]
                                            : 'background.paper',
                                        '&:hover': {
                                            bgcolor: active
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
            </Box>

        </Stack>
    );
}
