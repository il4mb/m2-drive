"use client";

import {
    Alert,
    Button,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Trash } from 'lucide-react';
import { useState } from 'react';
import { useDriveTrash } from '@/hooks/useDriveTrash';
import Container from '@/components/Container';
import StickyHeader from '@/components/navigation/StickyHeader';
import { motion } from 'motion/react';
import ContextMenu from '@/components/context-menu/ContextMenu';
import FileView, { FileMenuState } from '@/components/drive/FileView';
import { contextMenuStack } from '@/components/context-menu/ContextMenuItem';
import ActionDelete from '@/components/menu-actions/ActionDelete';
import ActionRestore from '@/components/menu-actions/ActionRestore';
import { File } from '@/entities/File';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import ConfirmationDialog from '@/components/ui/dialog/ConfirmationDialog';


type MenuState = FileMenuState & {
    restore: (f: File) => Promise<void>;
}

export default function Page() {

    const session = useCurrentSession();
    const { files, loading } = useDriveTrash(session?.user?.id);
    const [confirm, setConfirm] = useState('');
    const isConfirm = confirm == "KONFIRMASI";

    const menuItem = contextMenuStack<MenuState>({
        ActionRestore,
        ActionDelete,
    });

    const handleConfirm = async () => {
        if (!session?.user?.id) return;
        const result = await invokeFunction("emptyTrash", { userId: session?.user.id });
        if (!result.success) {
            throw new Error(result.error || "Unknown Error");
        }
    }


    return (
        <ContextMenu state={{}}>
            <Stack flex={1} overflow={"hidden"}>
                <Container maxWidth='lg' scrollable>

                    <StickyHeader
                        loading={loading}
                        actions={
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

                        }>
                        <Stack alignItems="center" spacing={1} direction="row">
                            <Trash size={20} />
                            <Typography fontWeight={600} fontSize={18}>
                                Tempat Sampah
                            </Typography>
                        </Stack>

                    </StickyHeader>

                    <Paper component={Stack} sx={{ p: 2, borderRadius: 2, boxShadow: 2, minHeight: 'max(600px, 85vh)', position: 'relative' }}>

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
                                    menu={menuItem as any}
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
