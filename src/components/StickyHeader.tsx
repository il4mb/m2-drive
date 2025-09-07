import { LinearProgress, Paper, SxProps } from '@mui/material';
import { motion } from 'motion/react';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { useStickyHeaderManager } from './StickyHeaderManager';

export interface StickyHeaderProps {
    children?: ReactNode;
    sx?: SxProps;
    loading?: boolean;
}

export default function StickyHeader({ children, sx, loading = false }: StickyHeaderProps) {
    const manager = useStickyHeaderManager?.();

    // Memoize the header element to prevent infinite re-renders
    const headerElement = useMemo(() => {
        return (
            <Paper
                component={motion.div}
                // initial={{ y: -20, opacity: 0 }}
                // animate={{ y: 0, opacity: 1 }}
                // exit={{ y: -20, opacity: 0 }}
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
                {children}
                {loading && (
                    <LinearProgress
                        sx={{ height: 3, width: '100%', position: 'absolute', bottom: -6, left: 0 }}
                    />
                )}
            </Paper>
        );
    }, [children, sx, loading]); // Remove manager from dependencies

    // If inside a manager, register and return null
    useEffect(() => {
        if (manager) {
            manager.setHeader(headerElement);
        }

        return () => {
            if (manager) manager.setHeader(null);
        };
    }, [manager, headerElement]);

    // If inside manager, don't render here
    if (manager) return null;

    // If outside manager, render normally
    return headerElement;
}