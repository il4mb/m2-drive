'use client'

import React, { useState, useRef } from 'react';
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
    CircularProgress,
    Stack,
    Alert,
    AlertTitle
} from '@mui/material';
import { Ban, CircleAlert, CircleQuestionMark, Info, X } from 'lucide-react';

export type ConfirmationDialogType = 'warning' | 'error' | 'info' | 'help';

interface ConfirmationDialogProps {
    onClose?: () => void;
    onConfirm: (signal?: AbortSignal) => Promise<unknown> | void;
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
    triggerElement: React.ReactElement;
    abortable?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
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
    confirmButtonColor,
    children,
    triggerElement,
    abortable = false
}) => {

    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        if (!abortable && pending) return;
        // Abort any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setPending(false);
        setOpen(false);
        setError(null);
        onClose?.();
    };

    const handleConfirm = () => {
        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const result = onConfirm(controller.signal);

            if (result instanceof Promise) {
                setPending(true);
                result
                    .then(() => {
                        setPending(false);
                        setOpen(false);
                        abortControllerRef.current = null;
                    })
                    .catch((e: any) => {
                        if (e.name === 'AbortError') {
                            console.log('Confirmation aborted');
                        } else {
                            setError(e.message || "Unknown Error");
                        }
                        setPending(false);
                    });
            } else {
                // Sync action — just close immediately
                setOpen(false);
                abortControllerRef.current = null;
            }
        } catch (e: any) {
            setOpen(false);
            setError(null);
            setPending(false);
            abortControllerRef.current = null;
        }
    };



    const getIcon = () => {
        switch (type) {
            case 'error':
                return <Box component={Ban} color="error" size={22} sx={{ fontSize: 40, color: 'currentcolor' }} />;
            case 'info':
                return <Box component={Info} color="info" size={22} sx={{ fontSize: 40, color: 'currentcolor' }} />;
            case 'help':
                return <Box component={CircleQuestionMark} color="info" size={22} sx={{ fontSize: 40, color: 'currentcolor' }} />;
            case 'warning':
            default:
                return <Box component={CircleAlert} color="warning" size={22} sx={{ fontSize: 40, color: 'currentcolor' }} />;
        }
    };

    const getColorByType = () => {
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
        <>
            {React.cloneElement(triggerElement, {
                // @ts-ignore
                onClick: handleOpen
            })}

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth={maxWidth}
                fullWidth={fullWidth}
                fullScreen={fullScreen}
                aria-labelledby="confirmation-dialog-title"
                aria-describedby="confirmation-dialog-description">
                <DialogTitle id="confirmation-dialog-title">
                    <Box display="flex" alignItems="center">
                        <Typography component={Stack} direction={"row"} alignItems={"start"} spacing={1} color={getColorByType()} >
                            {getIcon()}
                            <Typography variant="h6" component="span" sx={{ color: 'currentcolor' }}>
                                {title}
                            </Typography>
                        </Typography>
                        {showCloseButton && (
                            <IconButton
                                aria-label="close"
                                onClick={handleClose}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: 8,
                                    color: (theme) => theme.palette.grey[500]
                                }}
                                disabled={loading}>
                                <X />
                            </IconButton>
                        )}
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Box>
                        {error && (
                            <Alert severity='error' onClose={() => setError(null)} sx={{ mb: 2 }}>
                                <AlertTitle>Caught an Error</AlertTitle>
                                {error}
                            </Alert>
                        )}
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
                            size={['xs', 'sm'].includes(maxWidth) ? 'small' : 'medium'}
                            onClick={handleClose}
                            disabled={loading || disableCancel || pending}
                            variant="outlined"
                            color="inherit">
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || disableConfirm || pending}
                        variant="contained"
                        size={['xs', 'sm'].includes(maxWidth) ? 'small' : 'medium'}
                        color={confirmButtonColor || getColorByType()}
                        autoFocus
                        startIcon={pending ? <CircularProgress size={16} /> : null}>
                        {confirmText}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ConfirmationDialog;
