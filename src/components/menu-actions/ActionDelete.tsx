"use client"

import { Alert, alpha, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Shredder, Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ConfirmPopup from '@/components/ui/dialog/ConfirmPopup';
import { File } from '@/entity/File';
import useRequest from '@/components/hooks/useRequest';
import { motion } from 'motion/react';
import { getColor } from '@/theme/colors';
import { createContextMenu } from '@/components/context-menu/ContextMenuItem';
import { FileContextMenu } from '../drive/FileItem';
import { resolve } from 'path';
import { enqueueSnackbar } from 'notistack';


export interface ActionDeleteProps {
    file: File;
    onClose?: () => void;
    refresh?: () => void;
}
export function ActionDelete_({ file, onClose, refresh }: ActionDeleteProps) {

    const inputRef = useRef<HTMLInputElement>(null);
    const checkboxRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState('');
    const [checked, setChecked] = useState(false);


    const deleteFolder = useRequest({
        endpoint: "/api/drive/folder",
        method: "DELETE",
        queryParams: { id: file.id, confirm: text },
        onSuccess() {
            refresh?.();
            onClose?.();
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
        deleteFolder.clearError();
        deleteFolder.clearData();
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
                <MenuItem
                    color='error'
                    sx={(theme) => ({
                        color: getColor("error")[400],
                        ...theme.applyStyles("dark", {
                            color: getColor("error")[300],
                        })
                    })}>
                    <Trash size={14} />
                    <Typography ml={1}>
                        Hapus
                    </Typography>
                </MenuItem>
            </ConfirmPopup >
        </>
    );
}

type State = {
    request: ReturnType<typeof useRequest>
}
export default createContextMenu<FileContextMenu, State>({
    state({ file }) {
        return {
            request: useRequest({
                endpoint: "/api/drive/folder",
                method: "DELETE",
                onError(error) {
                    enqueueSnackbar(error.message, { variant: 'error' })
                },
            })
        }
    },
    style: {
        background: alpha(getColor('error')[400], 0.1),
        "&:hover": {
            background: alpha(getColor('error')[400], 0.4),
        }
    },
    icon: Shredder,
    label: "Hapus Permanen",
    action(payload) {
        return new Promise(() => { });
    },
    component({ payload, state, resolve }) {

        const { file, refresh } = payload;
        const { request } = state;

        const inputRef = useRef<HTMLInputElement>(null);
        const checkboxRef = useRef<HTMLInputElement>(null);
        const [text, setText] = useState('');
        const [checked, setChecked] = useState(false);

        const handleClose = (exit = true) => {
            if (request.pending) return;
            resolve(exit);
        }

        const handleConfirm = async () => {

            if (text != "HAPUS") {
                inputRef.current?.focus();
                throw new Error("Konfirmasi tidak cocok!");
            }
            if (!checked) {
                checkboxRef.current?.focus({ focusVisible: true } as any);
                throw new Error("Mohon centang kotak konfirmasi!");
            }
            await request.send({
                queryParams: {
                    fileId: file.id,
                    confirm: text
                }
            });
        }

        return (
            <Dialog onClose={() => handleClose(false)} open maxWidth="xs" fullWidth>
                <DialogTitle>Konfirmasi Hapus Permanen</DialogTitle>
                <DialogContent>
                    {/* <Typography>
                        Apakah kamu yakin ingin menghapus permanen {" "}
                        <strong>{file?.name || "file ini"}</strong>?
                    </Typography> */}
                    <DeleteBody
                        text={text}
                        setText={setText}
                        request={request}
                        checked={checked}
                        setChecked={setChecked}
                        inputRef={inputRef}
                        checkboxRef={checkboxRef}
                        file={file} />
                </DialogContent>
                <DialogActions>
                    <Button
                        size="small"
                        onClick={() => handleClose(false)}
                        color="inherit">
                        Batal
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={request.pending}
                        onClick={handleConfirm}>
                        {request.pending ? "Menghapus..." : "Hapus"}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
})


// Define body separately to prevent remount
const DeleteBody = ({ file, inputRef, checkboxRef, request, text, setText, checked, setChecked, }: any) => {
    return (
        <Stack>
            {request.error && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    exit={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}>
                    <Alert
                        severity="error"
                        variant="outlined"
                        sx={{ mb: 1 }}
                        onClose={request.errorClear}>
                        {request.error.message}
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
