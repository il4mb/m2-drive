import { Breakpoint, Stack } from '@mui/material';
import { ReactNode } from 'react';

export interface ContainerProps {
    children?: ReactNode;
    scrollable?: boolean;
    maxWidth?: Breakpoint;
}
export default function Container({ children, scrollable = false, maxWidth = "md" }: ContainerProps) {


    return (
        <Stack flex={1} overflow={scrollable ? "auto" : 'hidden'} direction={"column"}>
            <Stack flex={1} m={2} maxWidth={maxWidth} width={'100%'} mx={'auto'} direction={"column"}>
                {children}
            </Stack>
        </Stack>
    );
}