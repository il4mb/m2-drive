import { Breakpoint, Stack, SxProps } from '@mui/material';
import { ReactNode, forwardRef, useImperativeHandle, useState } from 'react';

export interface ContainerProps {
    children?: ReactNode;
    scrollable?: boolean;
    maxWidth?: Breakpoint;
    fillHeight?: boolean;
    sx?: SxProps;
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(({ children, scrollable = false, fillHeight = false, maxWidth = "md", sx = {} }, ref) => {

    return (
        <Stack
            ref={ref}
            component="div"
            px={[1, 1, 2]}
            flex={1}
            overflow={fillHeight ? "unset" : scrollable ? "auto" : "hidden"}
            direction="column"
            sx={sx}>
            <Stack
                flex={1}
                m={2}
                maxWidth={maxWidth}
                width="100%"
                mx="auto"
                direction="column">
                {children}
            </Stack>
        </Stack>
    );
}
);

Container.displayName = "Container";

export default Container;
