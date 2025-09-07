import { LinearProgress, Paper, Stack, SxProps } from '@mui/material';
import { motion } from 'motion/react';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { useStickyHeaderManager } from './StickyHeaderManager';
import ActionView from './ActionView';

export interface StickyHeaderProps {
    children?: ReactNode;
    sx?: SxProps;
    loading?: boolean;
    actions?: ReactNode;
}

export default function StickyHeader({ children, sx, loading = false, actions }: StickyHeaderProps) {

    const manager = useStickyHeaderManager();

    // Memoize the header element to prevent infinite re-renders
    const headerElement = useMemo(() => {
        return (
            <Paper
                component={motion.div}
                layoutId='sticky-header'
                layout
                sx={(theme) => ({
                    p: 2,
                    mb: 2,
                    position: ['static', 'static', 'sticky'],
                    top: 17,
                    zIndex: 10,
                    boxShadow: 4,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.paper,
                    ...(sx as any)
                })}>
                <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
                    {children}
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <ActionView />
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
    }, [children, sx, loading]);

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