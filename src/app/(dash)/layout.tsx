import ContextInjector from '@/components/context/ContextInjector';
import { CurrentSessionProvider } from '@/components/context/CurrentSessionProvider';
import { SidebarProvider } from '@/components/navigation/SidebarProvider';
import { Stack } from '@mui/material';
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
                        <SidebarProvider>
                            {children}
                        </SidebarProvider>
                    </Stack>
                </ContextMenu>
            </ContextInjector>
        </CurrentSessionProvider>
    );
}

