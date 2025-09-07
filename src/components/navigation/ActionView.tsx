import { Breakpoint, Stack } from '@mui/material';
import { Fragment } from 'react';
import { useActionsByBreakpoint } from './ActionsProvider';

export interface ActionSlotsProps {
    maxWidth?: Breakpoint
}
export default function ActionView({ maxWidth = "md" }: ActionSlotsProps) {

    const actions = useActionsByBreakpoint(maxWidth);

    return (
        <Stack direction={"row"} spacing={1} alignItems={"center"}>
            {actions.map(([id, node]) => (
                <Fragment key={id}>{node.component}</Fragment>
            ))}
        </Stack>
    );
}