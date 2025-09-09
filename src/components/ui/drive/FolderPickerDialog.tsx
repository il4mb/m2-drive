'use client'

import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';
import { File } from '@/entities/File';
import FolderPicker from '@/components/drive/FolderPicker';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';

export interface FolderPickerDialogProps {
    title?: ReactNode;
    open: boolean;
    disabled?: boolean | string[];
    onClose?: () => void;
    onSelect?: (file: File | null) => void;

}
export default function FolderPickerDialog({ title, onClose, onSelect, disabled = false, open = false }: FolderPickerDialogProps) {

    const auth = useCurrentSession();
    const [folder, setFolder] = useState<File | null>(null);
    const handleOnClose = () => {
        onClose?.();
    }

    const handleOnSelect = () => {
        onSelect?.(folder);
        handleOnClose();
    }

    if (!auth?.user) return;

    return (
        <Dialog
            maxWidth={"sm"}
            fullWidth
            open={open}
            onClose={handleOnClose}
            slotProps={{
                paper: {
                    sx: {
                        maxHeight: '500px'
                    }
                }
            }}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: 0 }}>
                {title && (
                    <Typography component={'div'} fontSize={18} fontWeight={600} mb={1}>
                        {title}
                    </Typography>
                )}
                <FolderPicker
                    userId={auth.user?.id}
                    onSelectedChange={setFolder}
                    disabled={disabled} />
            </DialogContent>
            <DialogActions>
                <Button
                    color="secondary"
                    onClick={handleOnClose}
                    sx={{ opacity: 0.7 }}>Batal</Button>
                <Button onClick={handleOnSelect}>
                    Pilih
                    <Typography fontWeight={800} ml={0.7}>
                        "{folder?.name || "My Drive"}"
                    </Typography>
                </Button>
            </DialogActions>
        </Dialog>
    );
}