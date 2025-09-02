'use client'

import useDarkMode from '@/hooks/useDarkMode';
import { ColorName, getColor } from '@/theme/colors';
import {
    Box,
    Button,
    ButtonProps,
    CircularProgress,
    Popover,
    PopoverOrigin,
    PopoverPosition,
    PopoverProps,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { cloneElement, ReactElement, useEffect, useMemo, useState } from 'react';

export interface IConfirmDialogProps<BodyProps> {
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
    onClose?: () => void;
    title?: string | ReactElement;
    bodyProps?: BodyProps;
    body?: React.FC<BodyProps>;
    color?: ColorName;
    slotProps?: PopoverProps['slotProps'] & {
        button?: ButtonProps;
        confirm?: {
            text?: string;
            disabled?: boolean;
        };
        cancel?: {
            text?: string;
            disabled?: boolean;
        };
    };
    tooltip?: {
        title: string;
        arrow?: boolean;
    };
    anchorPosition?: PopoverPosition;
    anchorOrigin?: PopoverOrigin;
    transformOrigin?: PopoverOrigin;
    children: ReactElement;
    shouldIgnore?: boolean;
}

export default function ConfirmPopup<T>(props: IConfirmDialogProps<T>) {
    const { color: variant = "primary", slotProps } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const isDark = useDarkMode();
    const color = useMemo(() => getColor(variant)[isDark ? 300 : 600], [isDark, variant]);
    const [loading, setLoading] = useState(false);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        if (props.shouldIgnore) {
            return handleConfirm();
        }
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        if (loading) return;
        setAnchorEl(null);
        props.onCancel?.();
    };

    const handleConfirm = async () => {
        if (loading) return;
        try {
            setLoading(true);
            await props.onConfirm?.();
            setAnchorEl(null);
        } catch (e) {
            console.error(e);
            // Optionally keep popup open on error
        } finally {
            setLoading(false);
        }
    };

    const getChildren = () => {
        if (!React.isValidElement(props.children)) return null;
        return cloneElement(props.children, {
            onClick: handleOpen,
            ...slotProps?.button,
        } as any);
    };

    const renderButton = () => {
        if (props.tooltip) {
            return (
                <Tooltip {...props.tooltip}>
                    {getChildren() as any}
                </Tooltip>
            );
        }
        return getChildren();
    };

    const open = Boolean(anchorEl);

    useEffect(() => {
        if (!anchorEl) props.onClose?.();
    }, [anchorEl]);

    return (
        <>
            {renderButton()}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorReference={props.anchorPosition ? "anchorPosition" : "anchorEl"}
                anchorPosition={props.anchorPosition}
                anchorOrigin={props.anchorOrigin || { vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={props.transformOrigin || { vertical: 'top', horizontal: 'center' }}
                slotProps={slotProps}>
                <Stack sx={{ p: 2, minWidth: '250px' }}>
                    {props.title && (
                        <Typography fontWeight={600} fontSize="18px" color={color}>
                            {props.title}
                        </Typography>
                    )}

                    {props.body && (
                        <Box mt={1}>
                            <props.body {...(props.bodyProps || {} as any)} />
                        </Box>
                    )}

                    <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}>
                        <Button
                            disabled={slotProps?.cancel?.disabled}
                            onClick={handleClose}
                            size="small"
                            variant="outlined"
                            color={variant === "error" ? "info" : "secondary"}>
                            {slotProps?.cancel?.text || "Cancel"}
                        </Button>
                        <Button
                            disabled={slotProps?.confirm?.disabled}
                            onClick={handleConfirm}
                            size="small"
                            color={variant}
                            variant="contained"
                            loading={loading}>
                            {loading ? <CircularProgress size={16} color="inherit" /> : (slotProps?.confirm?.text || "Confirm")}
                        </Button>
                    </Stack>
                </Stack>
            </Popover>
        </>
    );
}
