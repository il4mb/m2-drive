import { Breakpoint, Stack, SxProps } from '@mui/material';
import { ReactNode, RefObject } from 'react';

export interface ContainerProps {
    children?: ReactNode;
    scrollable?: boolean;
    maxWidth?: Breakpoint;
    fillHeight?: boolean;
    sx?: SxProps;
    ref?: RefObject<HTMLDivElement | null>
}
export default function Container({ children, scrollable = false, fillHeight = false, maxWidth = "md", sx = {}, ref }: ContainerProps) {


    return (
        <Stack
            component={"div"}
            ref={ref}
            px={[1, 1, 2]}
            flex={1}
            overflow={fillHeight ? "unset" : scrollable ? "auto" : 'hidden'}
            direction={"column"} sx={sx}>
            <Stack
                flex={1}
                m={2}
                maxWidth={maxWidth}
                width={'100%'}
                mx={'auto'}
                direction={"column"}>
                {children}
            </Stack>
        </Stack>
    );
}