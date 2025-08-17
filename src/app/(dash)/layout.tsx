'use client'

import ContextInjector from '@/components/context/ContextInjector';
import Sidebar from '@/components/ui/Sidebar';
import { Stack } from '@mui/material';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    return (
        <ContextInjector>
            <Stack flex={1} direction={"row"} maxHeight={'100vh'} onContextMenu={(e) => e.preventDefault()}>
                <Sidebar />
                <Stack flex={1} overflow={"hidden"}>
                    {children}
                </Stack>
            </Stack>
        </ContextInjector>
    );
}