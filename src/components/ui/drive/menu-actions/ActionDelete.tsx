"use client"

import { Alert, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Trash } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import ConfirmPopup from '../../dialog/ConfirmPopup';
import { DriveFile } from '@/entity/DriveFile';
import { useRequest } from '@/components/hooks/useRequest';
import { useDriveRoot } from '../DriveRoot';
import { motion } from 'motion/react';


export interface ActionDeleteProps {
    file: DriveFile;
    onClose?: () => void;
}
export default function ActionDelete({ file, onClose }: ActionDeleteProps) {

    const { refresh } = useDriveRoot();
    const inputRef = useRef<HTMLInputElement>(null);
    const checkboxRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState('');
    const [checked, setChecked] = useState(false);


    const deleteFolder = useRequest({
        endpoint: "/api/drive/folder",
        method: "DELETE",
        search: { id: file.id, confirm: text },
        onResult() {
            onClose?.();
            refresh();
        },
    });

    const handleConfirm = async () => {

        if (text != "HAPUS") {
            inputRef.current?.focus();
            throw new Error("Konfirmasi tidak cocok!");
        }
        if (!checked) {
            checkboxRef.current?.focus({ focusVisible: true } as any);
            throw new Error("Mohon centang kotak konfirmasi!");
        }
        await deleteFolder.send();
    }

    const handleClear = () => {
        setChecked(false);
        setText('');
        deleteFolder.errorClear();
    }

    useEffect(() => {
        handleClear();
    }, [file]);

    return (
        <>
            <ConfirmPopup
                onConfirm={handleConfirm}
                onClose={handleClear}
                onCancel={handleClear}
                color='error'
                title={"Konfirmasi Hapus Folder"}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right"
                }}
                transformOrigin={{
                    vertical: "bottom",
                    horizontal: "left"
                }}
                body={DeleteBody}
                bodyProps={{ deleteFolder, text, setText, checked, setChecked, inputRef, checkboxRef, file }}
                slotProps={{
                    paper: {
                        sx: {
                            maxWidth: '400px'
                        }
                    },
                    confirm: {
                        text: "Konfirmasi"
                    },
                    cancel: {
                        text: "Batal"
                    }
                }}>
                <MenuItem>
                    <Trash size={14} />
                    <Typography ml={1}>
                        Hapus
                    </Typography>
                </MenuItem>
            </ConfirmPopup >
        </>
    );
}


// Define body separately to prevent remount
const DeleteBody = ({ file, inputRef, checkboxRef, deleteFolder, text, setText, checked, setChecked, }: any) => {
    return (
        <Stack>
            {deleteFolder.error && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    exit={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <Alert
                        severity="error"
                        variant="outlined"
                        sx={{ mb: 1 }}
                        onClose={deleteFolder.errorClear}
                    >
                        {deleteFolder.error.message}
                    </Alert>
                </motion.div>
            )}

            <Typography mb={1.7} fontSize={12}>
                Untuk menghapus folder <strong>"{file.name}"</strong> mohon masukan{" "}
                <strong>HAPUS</strong> pada kolom dibawah.
            </Typography>

            <TextField
                inputRef={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                label="Konfirmasi"
                size="small"
                fullWidth
            />

            <FormControlLabel
                sx={{ mt: 1 }}
                control={
                    <Checkbox
                        slotProps={{ input: { ref: checkboxRef } }}
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                        size="small"
                        color="error"
                    />
                }
                label={
                    <Typography fontSize={12}>
                        Dengan ini anda secara sadar akan menghapus folder berserta isinya.
                    </Typography>
                }
            />
        </Stack>
    );
};
