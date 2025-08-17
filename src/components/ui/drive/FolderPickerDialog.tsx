'use client'

import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';
import FolderPicker from './FolderPicker';
import { IDriveFile } from '@/entity/DriveFile';

export interface FolderPickerDialogProps {
    title?: ReactNode;
    open: boolean;
    onClose?: () => void;
    onSelect?: (file: IDriveFile | null) => void;

}
export default function FolderPickerDialog({ title, onClose, onSelect, open = false }: FolderPickerDialogProps) {

    const [folder, setFolder] = useState<IDriveFile | null>(null);
    const handleOnClose = () => {
        onClose?.();
    }
    
    const handleOnSelect = () => {
        onSelect?.(folder);
        handleOnClose();
    }

    return (
        <Dialog
            maxWidth={"sm"}
            fullWidth
            open={open}
            onClose={handleOnClose}>
            <DialogContent>
                {title && (
                    <Typography component={'div'} fontSize={18} fontWeight={600} mb={1}>
                        {title}
                    </Typography>
                )}
                <FolderPicker onSelectedChange={setFolder} />
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