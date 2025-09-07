import { Breakpoint, Stack } from '@mui/material';
import { useActionsByBreakpoint } from './ActionsProvider';
import { motion } from 'motion/react';

export interface ActionSlotsProps {
    maxWidth?: Breakpoint
}
export default function ActionView({ maxWidth = "md" }: ActionSlotsProps) {

    const actions = useActionsByBreakpoint(maxWidth);

    return (
        <Stack component={motion.div} layout direction={"row"} spacing={1} alignItems={"center"}>
            {actions.map(([id, node], i) => {
                return (
                    <motion.div
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -10, opacity: 0 }}
                        transition={{ delay: (actions.length - i) * 0.2 }}
                        key={id}>
                        {node.component}
                    </motion.div>
                )
            })}
        </Stack>
    );
}