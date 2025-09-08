'use client'

import ContextInjector from '@/components/context/ContextInjector';
import { CurrentSessionProvider } from '@/components/context/CurrentSessionProvider';
import { ModuleViewerManager } from '@/viewer/ModuleViewerManager';
import Pattern from '@/components/icon/Pattern';
import { SidebarProvider } from '@/components/navigation/SidebarProvider';
import { Box, Stack } from '@mui/material';
import { ReactNode } from 'react';
import ContextMenu from '@/components/context-menu/ContextMenu';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    return (
        <CurrentSessionProvider>
            <ContextInjector>
                <ModuleViewerManager endpoint='/open/{ID}'>
                    <ContextMenu>
                        <Stack flex={1} overflow={"hidden"}>
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
                        </Stack>
                    </ContextMenu>
                </ModuleViewerManager>
            </ContextInjector>
        </CurrentSessionProvider>
    );
}

