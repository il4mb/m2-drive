import { IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { SnackbarKey, closeSnackbar as actionClose } from 'notistack';

export default function CloseSnackbar(key: SnackbarKey) {

    const handleClose = () => {
        if (!key) return;
        actionClose(key);
    }
    return (
        <IconButton size='small' onClick={handleClose}>
            <X size={14} />
        </IconButton>
    );
}