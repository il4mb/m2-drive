'use client'

import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Tooltip, Typography } from '@mui/material';
import { FolderPlus } from 'lucide-react';
import { ChangeEvent, ClipboardEvent, useEffect, useRef, useState } from 'react';
import { useDriveRoot } from './DriveRoot';
import { IFiles } from '@/entity/File';
import useRequest from '@/components/hooks/useRequest';
import { AnimatePresence, motion } from 'motion/react';

export interface ButtonAddFolderProps {
    folder: IFiles | null;
}
export default function ButtonAddFolder({ folder }: ButtonAddFolderProps) {

    const MAX_LENGTH = 34;
    const { refresh } = useDriveRoot();
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');

    const createFolder = useRequest({
        endpoint: "/api/drive/folder",
        method: "POST",
        body: {
            name: name.trim(),
            fId: folder?.id || null
        },
        onValidate() {
            if (!name) {
                inputRef.current?.focus();
                return false;
            }
            return true;
        },
        onSuccess() {
            refresh();
            handleDialogClose();
        },
        onError() {
            inputRef.current?.focus();
        }
    });

    const handleDialogClose = () => {
        setName("");
        setOpen(false);
    }

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        if (newVal.length > MAX_LENGTH) return;
        setName(newVal);
    }

    const handleOnPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text");
        const newVal = pasted.slice(0, MAX_LENGTH);
        setName(newVal);
    };

    useEffect(() => {
        createFolder.clearError();
        createFolder.clearData();
    }, [open]);

    return (
        <>
            <Tooltip title={`Buat folder baru`} arrow>
                <Button
                    variant='contained'
                    startIcon={<FolderPlus size={18} />}
                    onClick={() => setOpen(true)}>
                    Buat Folder
                </Button>
            </Tooltip>

            {open && (
                <Dialog maxWidth={"sm"} onClose={handleDialogClose} open fullWidth>
                    <DialogTitle>Buat Nama Folder</DialogTitle>
                    <DialogContent sx={{ overflow: 'visible' }}>
                        <AnimatePresence mode='wait'>
                            {createFolder.error && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}>
                                    <Alert
                                        severity='error'
                                        variant='outlined'
                                        sx={{ mb: 1 }}
                                        onClose={createFolder.clearError}>
                                        <AlertTitle>{createFolder.error.type}</AlertTitle>
                                        {createFolder.error.message}
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Typography mb={2}>
                            Masukan nama folder di field dibawah ini.
                        </Typography>

                        <TextField
                            inputRef={inputRef}
                            value={name}
                            onChange={handleNameChange}
                            onPaste={handleOnPaste}
                            label="Masukan nama folder"
                            fullWidth
                            autoFocus />
                        <Typography component={"small"} fontSize={11}>
                            Max Length: {name.length}/{MAX_LENGTH}
                        </Typography>

                    </DialogContent>
                    <DialogActions>
                        <Button color='secondary' sx={{ opacity: 0.7 }} onClick={handleDialogClose}>
                            Batal
                        </Button>
                        <Button loading={createFolder.pending} onClick={() => createFolder.send()}>
                            Buat Folder
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
}