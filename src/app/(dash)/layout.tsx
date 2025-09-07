'use client'

import ContextInjector from '@/components/context/ContextInjector';
import { CurrentSessionProvider } from '@/components/context/CurrentSessionProvider';
import { SimpleMediaViewerProvider } from '@/components/context/SimpleMediaViewer';
import { ModuleViewerManager } from '@/viewer/ModuleViewerManager';
import Pattern from '@/components/icon/Pattern';
import SidebarDrawer from '@/components/ui/navigation/SidebarDrawer';
import { SidebarProvider } from '@/components/ui/navigation/SidebarProvider';
import { Box, Stack } from '@mui/material';
import { AnimatePresence } from 'motion/react';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    return (
        <CurrentSessionProvider>
            <ContextInjector>
                <AnimatePresence mode={"wait"}>
                    <ModuleViewerManager endpoint='/open/{ID}'>
                        <Stack
                            sx={{
                                position: 'relative',
                                zIndex: 2
                            }}
                            flex={1}
                            direction={"row"}
                            height={'100vh'}
                            overflow={"hidden"}>
                            <SidebarProvider>
                                {children}
                            </SidebarProvider>
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
                    </ModuleViewerManager>
                </AnimatePresence>
            </ContextInjector>
        </CurrentSessionProvider>
    );
}

