'use client'

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
    useTheme,
    useMediaQuery,
    CircularProgress
} from '@mui/material';
import { Ban, CircleAlert, CircleQuestionMark, Info, X } from 'lucide-react';

export type ConfirmationDialogType = 'warning' | 'error' | 'info' | 'help';

interface ConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmationDialogType;
    loading?: boolean;
    disableConfirm?: boolean;
    disableCancel?: boolean;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    fullWidth?: boolean;
    showCloseButton?: boolean;
    hideCancelButton?: boolean;
    confirmButtonColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    children?: React.ReactNode;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    loading = false,
    disableConfirm = false,
    disableCancel = false,
    maxWidth = 'sm',
    fullWidth = true,
    showCloseButton = true,
    hideCancelButton = false,
    confirmButtonColor = 'primary',
    children
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const getIcon = () => {
        switch (type) {
            case 'error':
                return <Box component={Ban} color="error" sx={{ fontSize: 40 }} />;
            case 'info':
                return <Box component={Info} color="info" sx={{ fontSize: 40 }} />;
            case 'help':
                return <Box component={CircleQuestionMark} color="info" sx={{ fontSize: 40 }} />;
            case 'warning':
            default:
                return <Box component={CircleAlert} color="warning" sx={{ fontSize: 40 }} />;
        }
    };

    const getConfirmButtonColor = () => {
        if (confirmButtonColor) return confirmButtonColor;

        switch (type) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
            case 'help':
            default:
                return 'primary';
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            fullScreen={fullScreen}
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-description"
        >
            <DialogTitle id="confirmation-dialog-title">
                <Box display="flex" alignItems="center">
                    <Box mr={1.5}>{getIcon()}</Box>
                    <Typography variant="h6" component="span">
                        {title}
                    </Typography>
                    {showCloseButton && (
                        <IconButton
                            aria-label="close"
                            onClick={onClose}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                            disabled={loading}>
                            <X />
                        </IconButton>
                    )}
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Box py={1}>
                    {typeof message === 'string' ? (
                        <Typography variant="body1" id="confirmation-dialog-description">
                            {message}
                        </Typography>
                    ) : (
                        message
                    )}
                    {children}
                </Box>
            </DialogContent>

            <DialogActions>
                {!hideCancelButton && (
                    <Button
                        onClick={onClose}
                        disabled={loading || disableCancel}
                        variant="outlined"
                        color="inherit"
                    >
                        {cancelText}
                    </Button>
                )}
                <Button
                    onClick={onConfirm}
                    disabled={loading || disableConfirm}
                    variant="contained"
                    color={getConfirmButtonColor()}
                    autoFocus
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;