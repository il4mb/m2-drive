'use client'

import { PopoverProps, useMediaQuery } from '@mui/material';
import { ReactNode, useEffect, useMemo, useState } from 'react';
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

export default function MobileAction(props: MobileActionProps) {

    const [isMounted, setIsMounted] = useState(false);
    const provider = useActionsProvider();

    const data = useMemo(() => ({ ...props, component: props.children }), [props]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!provider) return;
        provider.addAction(props.id, data as any);

        return () => {
            if (isMounted) {
                provider.removeAction(data.id);
            }
        };
    }, [isMounted, data]);
    return null;
}