import { Paper, SxProps } from '@mui/material';
import { motion } from 'motion/react';
import { ReactNode } from 'react';

export interface StickyHeaderProps {
    children?: ReactNode;
    sx?: SxProps;
}
export default function StickyHeader({ children, sx }: StickyHeaderProps) {
    return (
        <Paper
            component={motion.div}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            layoutId="header"
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
        </Paper>
    );
}