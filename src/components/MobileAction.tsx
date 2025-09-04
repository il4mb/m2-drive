'use client'

import { PopoverProps, useMediaQuery } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import { useSidebar } from './ui/navigation/SidebarProvider';

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
    id,
    icon,
    children,
    showAsPopover = false,
    position = 0,
    slotProps
}: MobileActionProps) {
    const [isMounted, setIsMounted] = useState(false);
    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('md'));
    const { addMobileAction, removeMobileAction } = useSidebar();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && isMobile && children) {
            addMobileAction({
                id,
                icon,
                component: children,
                showAsPopover,
                position,
                slotProps
            });
        }

        return () => {
            if (isMounted) {
                removeMobileAction(id);
            }
        };
    }, [isMounted, isMobile, id, icon, children, showAsPopover, position, slotProps, addMobileAction, removeMobileAction]);

    // On desktop, render children directly
    if (!isMobile) {
        return <>{children}</>;
    }

    // On mobile, the component is rendered through the SidebarProvider
    return null;
}