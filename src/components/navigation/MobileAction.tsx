'use client'

import { PopoverProps, useMediaQuery } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import { useActionsProvider } from './ActionsProvider';

export interface MobileActionProps {
    id: string;
    icon?: ReactNode;
    children?: ReactNode;
    showAsPopover?: boolean;
    position?: number;
    slotProps?: {
        popover?: PopoverProps
    }
}

export default function MobileAction({
    id, icon, children, showAsPopover = false, position = 0, slotProps
}: MobileActionProps) {

    const [isMounted, setIsMounted] = useState(false);
    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('md'));
    const provider = useActionsProvider();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!provider) return;
        provider.addAction(id, {
            id, icon, component: children, showAsPopover, position, slotProps
        });

        return () => {
            if (isMounted) {
                provider.removeAction(id);
            }
        };
    }, [isMounted, isMobile, id, icon, children, showAsPopover, position, slotProps]);
    return null;
}