'use client'

import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';
import FolderPicker from './FolderPicker';
import { IDriveFile } from '@/entity/DriveFile';

export interface FolderPickerDialogProps {
    title?: ReactNode;
    open: boolean;
    disabled?: boolean | string[];
    onClose?: () => void;
    onSelect?: (file: IDriveFile | null) => void;

}
export default function FolderPickerDialog({ title, onClose, onSelect, disabled = false, open = false }: FolderPickerDialogProps) {

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
                <FolderPicker onSelectedChange={setFolder} disabled={disabled} />
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