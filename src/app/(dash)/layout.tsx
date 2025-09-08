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

                <ContextMenu>
                    <Stack flex={1} overflow={"hidden"}>
                        {/* <Stack
                                sx={{
                                    position: 'relative',
                                    zIndex: 2
                                }}
                                flex={1}
                                direction={"row"}
                                height={'100vh'}
                                overflow={"hidden"}> */}
                        <SidebarProvider>
                            {children}
                        </SidebarProvider>
                        {/* </Stack> */}
                    </Stack>
                </ContextMenu>
            </ContextInjector>
        </CurrentSessionProvider>
    );
}

