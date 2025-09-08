'use client'

import { PopoverProps, useMediaQuery } from '@mui/material';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useActionsProvider } from './ActionsProvider';
import { isEqual } from 'lodash';

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
    const provider = useActionsProvider();
    const prevDataRef = useRef<any>(null);

    const data = useMemo(() => ({ ...props, component: props.children }), [
        props.id,
        props.icon,
        props.children,
        props.showAsPopover,
        props.position,
        props.slotProps,
    ]);

    // Add action once on mount
    useEffect(() => {
        if (!provider) return;
        provider.addAction(props.id, data as any);
        prevDataRef.current = data;

        return () => {
            provider.removeAction(props.id);
        };
    }, [provider, props.id]);

    // Update only if data changed
    useEffect(() => {
        if (!provider) return;
        if (!isEqual(prevDataRef.current, data)) {
            provider.updateAction(props.id, data);
            prevDataRef.current = data;
        }
    }, [provider, props.id, data]);

    return null;
}