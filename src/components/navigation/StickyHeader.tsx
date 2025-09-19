import { IconButton, LinearProgress, Paper, Stack, SxProps, Tooltip } from '@mui/material';
import { motion } from 'motion/react';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { useStickyHeaderManager } from './StickyHeaderManager';
import ActionView from './ActionView';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useDarkMode from '@/hooks/useDarkMode';

export interface StickyHeaderProps {
    children?: ReactNode;
    sx?: SxProps;
    loading?: boolean;
    actions?: ReactNode;
    canGoBack?: boolean;
}

export default function StickyHeader({ children, sx, loading = false, actions, canGoBack = false }: StickyHeaderProps) {

    const dark = useDarkMode();
    const router = useRouter();
    const manager = useStickyHeaderManager();

    const handleGoback = () => {
        router.back();
    }

    // Memoize the header element to prevent infinite re-renders
    const headerElement = useMemo(() => {
        return (
            <Paper
                component={motion.div}
                layoutId='sticky-header'
                layout
                sx={{
                    p: 2,
                    mb: 2,
                    position: ['static', 'static', 'sticky'],
                    top: 17,
                    zIndex: 10,
                    boxShadow: dark ? 4 : 2,
                    borderRadius: 2,
                    background: 'transparent',
                    backdropFilter: 'blur(10px)',
                    ...(sx as any)
                }}>
                <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
                    <Stack flex={1} direction={"row"} spacing={1} alignItems={"center"}>
                        {canGoBack && (
                            <Tooltip title="Kembali" onClick={handleGoback} sx={{ mr: 1 }} arrow>
                                <IconButton>
                                    <ChevronLeft size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {children}
                    </Stack>
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <ActionView minWidth='md' />
                        {actions}
                    </Stack>
                </Stack>
                {loading && (
                    <LinearProgress
                        sx={{ height: 3, width: '100%', position: 'absolute', bottom: -6, left: 0 }}
                    />
                )}
            </Paper>
        );
    }, [children, sx, canGoBack, loading, actions]);

    // If inside a manager, register and return null
    useEffect(() => {
        if (manager && manager.header !== headerElement) {
            manager.setHeader(headerElement);
        }
        return () => {
            if (manager && manager.header === headerElement) {
                manager.setHeader(null);
            }
        };
    }, [headerElement]);

    // If inside manager, don't render here
    if (manager) return null;

    // If outside manager, render normally
    return headerElement;
}