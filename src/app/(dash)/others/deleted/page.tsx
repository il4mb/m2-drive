"use client";

import {
    Alert,
    Button,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMyTrash } from '@/hooks/useMyTrash';
import Container from '@/components/Container';
import StickyHeader from '@/components/StickyHeader';
import { motion } from 'motion/react';
import ContextMenu from '@/components/context-menu/ContextMenu';
import FileView, { FileMenuState } from '@/components/drive/FileView';
import { contextMenuStack } from '@/components/context-menu/ContextMenuItem';
import ActionDelete from '@/components/menu-actions/ActionDelete';
import ActionRestore from '@/components/menu-actions/ActionRestore';
import { File } from '@/entity/File';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { emptyTrash, removeFile, restoreFile } from '@/server/functions/userDrive';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import ConfirmationDialog from '@/components/ui/dialog/ConfirmationDialog';
import ConfirmPopup from '@/components/ui/dialog/ConfirmPopup';


type MenuState = FileMenuState & {
    restore: (f: File) => Promise<void>;
}

export default function Page() {

    const { user } = useCurrentSession();
    const { files, loading } = useMyTrash();
    const [confirm, setConfirm] = useState('');
    const isConfirm = confirm == "KONFIRMASI";

    const menuItem = contextMenuStack<MenuState>([
        ActionRestore,
        ActionDelete,
    ]);


    const handleRestore = async (file: File) => {
        if (!user?.id) return;
        const response = await invokeFunction(restoreFile, { fileId: file.id, userId: user.id });
        if (!response.success) {
            enqueueSnackbar(response.error || "Unknown Error", { variant: 'error', action: CloseSnackbar })
        }
    }


    const handleConfirm = async () => {

        const result = await invokeFunction(emptyTrash, { userId: user?.id || '' });
        if (!result.success) {
            throw new Error(result.error || "Unknown Error");
        }
    };

    return (
        <ContextMenu state={{}}>
            <Stack flex={1} overflow={"hidden"}>
                <Container maxWidth='lg' scrollable>

                    <StickyHeader>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" position={'relative'}>
                            <Stack alignItems="center" spacing={1} direction="row">
                                <Trash size={20} />
                                <Typography fontWeight={600} fontSize={18}>
                                    Tempat Sampah
                                </Typography>
                            </Stack>
                            <ConfirmationDialog
                                triggerElement={
                                    <Button variant="outlined" color="error">
                                        Kosongkan Tempat Sampah
                                    </Button>
                                }
                                title="Kosongkan Tempat Sampah?"
                                message={
                                    <>
                                        <Typography mb={2}>Apakah kamu yakin akan mengkosongkan tempat sampah?, ini akan menghapus semua file dan folder!</Typography>
                                        <Alert variant='outlined' severity="error">
                                            Tindakan ini tidak dapat dipulihkan!
                                        </Alert>
                                        <Typography mt={2}>
                                            Untuk melajukan mohon ketikan <strong>KONFIRMASI</strong> pada kolom dibawah ini.
                                        </Typography>
                                        <TextField
                                            value={confirm}
                                            onChange={e => setConfirm(e.target.value)}
                                            sx={{ mt: 1 }}
                                            label="Konfirmasi"
                                            inputProps={{
                                                autoComplete: 'off',
                                                autoCorrect: 'off',
                                                spellCheck: 'false'
                                            }}
                                        />

                                    </>
                                }
                                onConfirm={handleConfirm}
                                confirmText="Kosongkan"
                                disableConfirm={!isConfirm}
                                cancelText="Batal"
                                maxWidth='sm'
                                type="error" />

                            {loading && (
                                <LinearProgress sx={{
                                    position: 'absolute',
                                    bottom: '-10px',
                                    left: 0,
                                    width: '100%',
                                    height: 2
                                }} />
                            )}
                        </Stack>
                    </StickyHeader>

                    <Paper component={Stack} sx={{ p: 2, borderRadius: 2, boxShadow: 2, minHeight: '85dvh', position: 'relative' }}>

                        {!loading && files.length == 0 ? (
                            <Stack flex={1} justifyContent={"center"} alignItems={"center"}>
                                <Typography fontSize={18} fontWeight={600} color='text.secondary'>
                                    Tempat ini Kosong
                                </Typography>
                            </Stack>
                        ) : files.map((file, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: 0.03 * i }}
                                key={file.id}>
                                <FileView
                                    menu={menuItem}
                                    menuState={{
                                        file,
                                        restore: handleRestore
                                    }}
                                    size={26}
                                    file={file}
                                />
                            </motion.div>
                        ))}
                    </Paper>
                </Container>
            </Stack>
        </ContextMenu>
    );
}
