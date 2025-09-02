import { LinearProgress, Paper, SxProps } from '@mui/material';
import { motion } from 'motion/react';
import { ReactNode } from 'react';

export interface StickyHeaderProps {
    children?: ReactNode;
    sx?: SxProps;
    loading?: boolean;
}
export default function StickyHeader({ children, sx, loading = false }: StickyHeaderProps) {

    return (
        <Paper
            component={motion.div}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            layout
            sx={(theme) => ({
                p: 2,
                mb: 2,
                position: 'sticky',
                top: 17,
                zIndex: 10,
                boxShadow: 4,
                borderRadius: 2,
                bgcolor: theme.palette.background.paper,
                ...(sx as any)
            })}>
            {children}
            {loading && (
                <LinearProgress sx={{ height: 3, width: '100%', position: 'absolute', bottom: -6, left: 0 }} />
            )}
        </Paper>
    );
}