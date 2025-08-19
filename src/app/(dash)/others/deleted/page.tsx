"use client";

import useRequest from '@/components/hooks/useRequest';
import { IFiles } from '@/entity/File';
import { formatFileSize, formatLocaleDate } from '@/libs/utils';
import {
    Alert,
    AlertTitle,
    Button,
    Container,
    Stack,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Paper,
    MenuItem,
} from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { CircleAlert, Folder, RotateCcw, Shredder, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import ContextMenu from '@/components/ui/ContextMenu';
import ActionRestore from '@/components/ui/menu-actions/ActionRestore';
import ActionDelete from '@/components/ui/menu-actions/ActionDelete';

export default function Page() {

    const [files, setFiles] = useState<IFiles[]>([]);
    const request = useRequest({
        endpoint: "/api/drive",
        method: "GET",
        queryParams: { trashed: true, recursive: true },
        onSuccess(result) {
            setFiles(result.data);
        },
    });

    const refresh = () => {
        request.send();
    }

    useEffect(() => {
        refresh();
    }, []);

    return (
        <Stack flex={1} onContextMenu={(e) => e.preventDefault()} overflow={"hidden"}>
            <Container>
                <Stack py={2} direction="row" alignItems="center" justifyContent="space-between">
                    <Stack alignItems="center" spacing={1} direction="row">
                        <Trash size={20} />
                        <Typography fontWeight={600} fontSize={18}>
                            Tempat Sampah
                        </Typography>
                    </Stack>
                    <Button variant="outlined" color="error">
                        Kosongkan Tempat Sampah
                    </Button>
                </Stack>
            </Container>

            <Container sx={{ overflow: 'auto', flex: 1 }}>
                {request.error && (
                    <Alert severity="error" onClose={request.clearError} sx={{ mb: 1 }}>
                        <AlertTitle>{request.error.type}</AlertTitle>
                        {request.error.message}
                    </Alert>
                )}

                <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 4 }}>
                    <Table size="medium">
                        <TableHead sx={{ position: 'sticky', top: 0 }}>
                            <TableRow>
                                <TableCell><Typography fontWeight={600}>Nama</Typography></TableCell>
                                <TableCell width={120}><Typography fontWeight={600}>Ukuran</Typography></TableCell>
                                <TableCell width={160}><Typography fontWeight={600}>Tgl. Hapus</Typography></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ overflow: 'auto' }}>
                            <AnimatePresence>
                                {!request.pending && files.length === 0 && (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}>
                                        <TableCell colSpan={3} align="center">
                                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} py={2}>
                                                <CircleAlert />
                                                <Typography>Tidak ada file!</Typography>
                                            </Stack>
                                        </TableCell>
                                    </motion.tr>
                                )}
                                {files.map((file, i) => (
                                    <ContextMenu
                                        payload={{ file, refresh }}
                                        key={file.id}
                                        menu={[ActionRestore, ActionDelete]}
                                        highlight>
                                        <motion.tr
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.2, delay: 0.03 * i }}
                                            style={{ cursor: "pointer" }}>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    {file.type === "folder" ? (
                                                        <Folder strokeWidth={1} size={20} />
                                                    ) : (
                                                        <FileIcon variant="default" size={20} type={file.type} />
                                                    )}
                                                    <Typography>{file.name}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{formatFileSize(file.meta?.size || 0)}</TableCell>
                                            <TableCell>
                                                {formatLocaleDate(file.meta?.trashedAt || 0, "ID-id")}
                                            </TableCell>
                                        </motion.tr>
                                    </ContextMenu>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>
        </Stack>
    );
}
