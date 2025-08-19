'use client'

import { Alert, AlertTitle, Box, Button, IconButton, LinearProgress, ListItem, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import { createContext, useContext, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, CircleAlert, CloudUpload, FolderOpen } from 'lucide-react';
import { IFiles } from '@/entity/File';
import Link from 'next/link';
import ActionAddFolder from './ButtonAddFolder';
import FileItem from './FileItem';
import ActionRename from '../menu-actions/ActionRename';
import ActionOpen from '../menu-actions/ActionOpen';
import ActionCopy from '../menu-actions/ActionCopy';
import useRequest from '@/components/hooks/useRequest';
import ActionMove from '../menu-actions/ActionMove';
import ActionTrash from '../menu-actions/ActionTrash';
import ActionDivider from '../menu-actions/ActionDivider';
import ActionShare from '../menu-actions/ActionShare';
import { useSimpleMediaViewer } from '@/components/context/SimpleMediaViewer';

type Props = {
    layout?: "grid" | "list";
    sortBy?: "type" | "createdAt" | "updatedAt";
    order?: "asc" | "desc";
}
export default function DriveRoot({ layout = "list", sortBy, order }: Props) {

    const simpleView = useSimpleMediaViewer();
    const [selected, setSelected] = useState<IFiles | null>(null);
    const [folder, setFolder] = useState<IFiles | null>(null);
    const [openedFolders, setOpenedFolders] = useState<IFiles[]>([]);
    const [files, setFiles] = useState<IFiles[]>([]);

    const request = useRequest({
        endpoint: "/api/drive",
        queryParams: {
            pId: folder?.id,
            sortBy,
            order
        },
        onSuccess(result) {
            setFiles(result.data);
        },
    });

    const refresh = () => request.send();

    const openFolder = (newFolder: IFiles | null) => {
        if (newFolder) {
            setOpenedFolders(prev => [...prev, newFolder]);
        } else {
            setOpenedFolders([]);
        }
        setFolder(newFolder);
    }

    const handleBack = () => {
        if (request.pending) return;
        setOpenedFolders(prev => {
            const updated = [...prev];
            updated.pop();
            const last = updated[updated.length - 1] || null;
            setFolder(last);
            return updated;
        });
    }
    useEffect(() => {
        refresh();
    }, [folder?.id, sortBy, order]);



    const stateValue = {
        selected,
        select: setSelected,
        setFolder: openFolder,
        refresh: request.send
    }


    return (
        <Context value={stateValue}>
            <Stack flex={1} overflow={"hidden"} pb={2}>
                {/* HEADER */}
                <Box sx={{ position: 'relative' }}>
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
                    <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%'
                    }}>
                        {request.pending && (
                            <LinearProgress sx={{ height: 2, width: '100%' }} />
                        )}
                    </Box>
                </Box>

                {request.error && (
                    <Box my={2}>
                        <Alert
                            severity='error'
                            variant='outlined'
                            onClose={request.clearError}>
                            <AlertTitle>{request.error.type}</AlertTitle>
                            {request.error.message}
                            <Button size='small' onClick={refresh}>
                                Coba lagi
                            </Button>
                        </Alert>
                    </Box>
                )}

                {layout == "list" && (
                    <Stack direction={"row"} px={4} py={1}>
                        <Typography flexBasis={480} fontWeight={500} fontSize={16}>Nama</Typography>
                        <Typography fontWeight={500} fontSize={16}>Terakhir Dibuka</Typography>
                    </Stack>
                )}
                <Stack
                    flex={1}
                    overflow={"auto"}
                    pb={2}
                    sx={{
                        bgcolor: 'background.paper',
                        p: 2,
                        borderRadius: 2,

                    }}>
                    <Stack
                        flexDirection={"row"}
                        flexWrap={"wrap"}
                        justifyContent={"start"}
                        alignItems={"start"}>
                        {!request.pending && files.length == 0 && (
                            <ListItem>
                                <ListItemIcon>
                                    <CircleAlert />
                                </ListItemIcon>
                                <ListItemText sx={{ ml: 1 }}>
                                    Tidak ada file!
                                </ListItemText>
                            </ListItem>
                        )}
                        {files.map((file, i) => (
                            <FileItem
                                key={i}
                                index={i}
                                file={file}
                                layout={layout}
                                onRefresh={refresh}
                                onOpen={(file) => {
                                    if (file.type == "folder") {
                                        openFolder(file);
                                    } else {
                                        simpleView(file);
                                    }
                                }}
                                menu={[
                                    ActionOpen,
                                    ActionShare,
                                    ActionDivider,
                                    ActionCopy,
                                    ActionMove,
                                    ActionRename,
                                    ActionTrash
                                ]} />
                        ))}
                    </Stack>
                </Stack>
            </Stack>
        </Context>
    );
}



interface DriveRootState {
    setFolder: (folder: IFiles) => void;
    select: (file: IFiles) => void;
    selected: IFiles | null;
    refresh: () => void;
}

const Context = createContext<DriveRootState | undefined>(undefined);


export const useDriveRoot = () => {
    const context = useContext(Context);
    if (!context) throw new Error('useDriveRoot must be used within a DriveRoot');
    return context;
};