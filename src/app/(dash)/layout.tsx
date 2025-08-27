'use client'

import ContextInjector from '@/components/context/ContextInjector';
import { SimpleMediaViewerProvider } from '@/components/context/SimpleMediaViewer';
import Pattern from '@/components/icon/Pattern';
import Sidebar from '@/components/ui/Sidebar';
import { Box, Paper, Stack } from '@mui/material';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    return (
        <ContextInjector>
            <SimpleMediaViewerProvider>
                <Stack
                    sx={{
                        position: 'relative',
                        zIndex: 2
                    }}
                    flex={1}
                    direction={"row"}
                    maxHeight={'100vh'}
                    onContextMenu={(e) => e.preventDefault()}>
                    <Sidebar />
                    <Stack flex={1}>
                        {children}
                    </Stack>

                </Stack>
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 1,
                        pointerEvents: 'none',
                    }}>
                    <Pattern
                        width={'100%'}
                        height={'100%'}
                        opacity={0.8} />
                </Box>
            </SimpleMediaViewerProvider>
        </ContextInjector>
    );
}

