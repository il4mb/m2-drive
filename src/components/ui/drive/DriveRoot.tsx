'use client'

import { Alert, AlertTitle, Box, Button, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import DriveFile from './DriveFile';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, CircleAlert, CloudUpload, FolderOpen } from 'lucide-react';
import { IDriveFile } from '@/entity/DriveFile';
import Link from 'next/link';
import ActionAddFolder from './ActionAddFolder';


export default function DriveRoot() {

    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<IDriveFile | null>(null);
    const [folder, setFolder] = useState<IDriveFile | null>(null);
    const [openedFolders, setOpenedFolders] = useState<IDriveFile[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [files, setFiles] = useState<IDriveFile[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    const fetchFiles = async () => {
        if (loading) return;

        // Abort request sebelumnya
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const searchParams = new URLSearchParams();
            if (folder) {
                searchParams.set('fId', folder.id);
            }

            const response = await fetch(`/api/drive?${searchParams}`, { signal: controller.signal }).then(e => e.json());
            if (!response.status) throw new Error(response.message);
            setFiles(response.data);
        } catch (e: any) {
            if (e.name != "AbortError") {
                setError(e);
            }
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 600);
        }
    };

    useEffect(() => {
        fetchFiles();
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, [folder?.id]);

    const handleSetFolder = (newFolder: IDriveFile | null) => {
        if (newFolder) {
            setOpenedFolders(prev => [...prev, newFolder]);
        } else {
            setOpenedFolders([]);
        }
        setFolder(newFolder);
    };

    const handleBack = () => {
        if (loading) return;
        // 🔹 Abort request ketika back
        if (abortRef.current) {
            abortRef.current.abort();
        }
        setOpenedFolders(prev => {
            const updated = [...prev];
            updated.pop();
            const last = updated[updated.length - 1] || null;
            setFolder(last);
            return updated;
        });
    };

    return (
        <Context
            value={{
                selected,
                select(file) {
                    setSelected(file);
                },
                setFolder: handleSetFolder,
                refresh: fetchFiles
            }}>
            <Stack flex={1}>
                <Box>
                    <Stack
                        component={motion.div}
                        direction={"row"}
                        spacing={2}
                        alignItems={"center"}
                        justifyContent={"space-between"}
                        pb={1}>
                        <Stack
                            direction={"row"}
                            alignItems={"center"}
                            spacing={1}>
                            {folder && (
                                <motion.div initial={{ x: -10 }} animate={{ x: 0 }} style={{ display: 'inline-block' }}>
                                    <IconButton onClick={handleBack} disabled={openedFolders.length === 0}>
                                        <ChevronLeft />
                                    </IconButton>
                                </motion.div>
                            )}
                            <FolderOpen />
                            <Typography fontSize={18} fontWeight={600}>
                                {folder?.name || "My Drive"}
                            </Typography>
                        </Stack>
                        <Stack direction={"row"} spacing={1} alignItems={"center"}>
                            <ActionAddFolder folder={folder} />
                            <Tooltip title={`Unggah file ke ${folder?.name || 'My Drive'}`} arrow>
                                <Button
                                    LinkComponent={Link}
                                    href={`/drive/upload?fid=${folder?.id || ''}`}
                                    variant='contained'
                                    startIcon={<CloudUpload size={18} />}>
                                    Unggah
                                </Button>
                            </Tooltip>
                        </Stack>
                    </Stack>
                    {loading && (
                        <LinearProgress sx={{ height: 2, width: '100%' }} />
                    )}
                </Box>


                {error && (
                    <Box my={2}>
                        <Alert severity='error' variant='outlined'>
                            <AlertTitle>Caught an {error.name}</AlertTitle>
                            {error.message}
                        </Alert>
                    </Box>
                )}

                <List component={motion.div} layout>
                    {!loading && files.length == 0 && (
                        <ListItem>
                            <ListItemIcon>
                                <CircleAlert />
                            </ListItemIcon>
                            <ListItemText sx={{ ml: 1 }}>
                                Tidak ada file!
                            </ListItemText>
                        </ListItem>
                    )}
                    {files.map((file, i) => <DriveFile key={i} index={i} file={file} />)}
                </List>
            </Stack>
        </Context>
    );
}



interface DriveRootState {
    setFolder: (folder: IDriveFile) => void;
    select: (file: IDriveFile) => void;
    selected: IDriveFile | null;
    refresh: () => void;
}

const Context = createContext<DriveRootState | undefined>(undefined);


export const useDriveRoot = () => {
    const context = useContext(Context);
    if (!context) throw new Error('useDriveRoot must be used within a DriveRoot');
    return context;
};