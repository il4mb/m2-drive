import { Breakpoint, Stack, useMediaQuery } from '@mui/material';
import { useActionsProvider } from './ActionsProvider';
import { AnimatePresence, motion } from 'motion/react';
import { createElement, useMemo } from 'react';

export interface ActionSlotsProps {
    maxWidth?: Breakpoint;
    minWidth?: Breakpoint;
    id?: string | string[];
}

export default function ActionView({ maxWidth, minWidth, id }: ActionSlotsProps) {

    const provider = useActionsProvider();
    const isMatch = useMediaQuery((theme: any) => {
        if (maxWidth && minWidth) {
            return theme.breakpoints.between(minWidth, maxWidth);
        }
        if (maxWidth) {
            return theme.breakpoints.down(maxWidth);
        }
        if (minWidth) {
            return theme.breakpoints.up(minWidth);
        }
        return true;
    });

    const actions = useMemo(
        () => (isMatch ? provider.actions.filter(e => id ? (Array.isArray(id) ? id : [id]).includes(e[0]) : true) : []),
        [isMatch, provider.actions, id]
    );

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <AnimatePresence mode="sync">
                {actions.map(([id, node], i) => (
                    <motion.div
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -10, opacity: 0 }}
                        transition={{ delay: i * 0.2 }}
                        key={id}>
                        {typeof node.component === 'function'
                            ? createElement(node.component, node.componentProps)
                            : node.component}
                    </motion.div>
                ))}
            </AnimatePresence>
        </Stack>
    );
}
