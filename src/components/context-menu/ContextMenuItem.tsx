'use client'

import { MenuItem, ListItemIcon, ListItemText, Stack, SxProps, Typography } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { ReactNode, useState } from 'react';

export interface ContextMenuItemProps<T> {
    state: T;
    onClose: () => void;
    children?: ReactNode;
}

export function ContextMenuItem<T>({ children }: ContextMenuItemProps<T>) {
    return <MenuItem>{children}</MenuItem>;
}

export type ContextMenuItemDef<T> = {
    // state?: (payload: T) => S,
    icon?: React.FC<{ className?: string, size?: number, state: T }>;
    fallbackIcon?: React.FC<{ className?: string, size?: number, state: T }>;
    label: string | React.FC<{ state: T }>;
    action?: (state: T) => void | boolean | Promise<void | boolean>;
    component?: React.FC<{ state: T, resolve: (close?: boolean) => void; }>;
    style?: (state: T) => (SxProps | false | null | undefined);
    // [k: string]: any
}

/**
 * Factory for building context menu items.
 */
export function createContextMenu<T>(def: ContextMenuItemDef<T>): React.FC<ContextMenuItemProps<T>> {

    const MenuComponent: React.FC<ContextMenuItemProps<T>> = ({ state, onClose }) => {

        // const state = (def.state?.(payload) || {}) as S;
        const Component = def.component;
        const Icon = def.icon;
        const [pending, setPending] = useState(false);
        const [open, setOpen] = useState(false);

        const handleClick = async () => {

            try {
                if (def.action) {
                    if (pending) return;
                    setPending(true);
                    const exit = await def.action?.(state);
                    if (typeof exit != "boolean" || exit == true) {
                        onClose();
                    }
                } else if (Component) {
                    setOpen(true);
                }
            } catch (e) {
                console.log(e);
            } finally {
                setPending(false);
            }
        };

        const resolve = (close = true) => {
            setPending(false);
            setOpen(false);
            if (close == true) {
                onClose();
            }
        }

        return (
            <>
                <Stack
                    direction={"row"}
                    spacing={1}
                    alignItems={"center"}
                    onContextMenu={(e) => (e.preventDefault(), e.stopPropagation(), handleClick())}
                    sx={{
                        px: 1,
                        py: 0.8,
                        cursor: "pointer",
                        borderRadius: 1,
                        userSelect: 'none',
                        "&:hover": {
                            ...((def.action || def.component) && {
                                bgcolor: "action.hover"
                            })
                        },
                        ...(typeof def.style == "function" ? def.style(state as any) : def.style),
                        ...((pending || open) && {
                            bgcolor: "action.hover"
                        })
                    }}
                    onClick={handleClick}>
                    {Icon && (
                        <ListItemIcon>
                            {pending
                                ? <RefreshCw size={14} className="animate-spin" />
                                : <Icon size={14} state={state} />}
                        </ListItemIcon>
                    )}
                    <ListItemText sx={{ overflow: 'hidden' }}>
                        <Typography component={"div"} whiteSpace={"nowrap"} overflow={"hidden"} textOverflow={"ellipsis"}>
                            {typeof def.label == "string"
                                ? def.label
                                : <def.label state={state} />}
                        </Typography>

                    </ListItemText>
                </Stack>

                {open && Component && (
                    <Component
                        state={state}
                        resolve={resolve} />
                )}
            </>
        );
    };

    MenuComponent.displayName = `ContextMenu(${def.label})`;
    return MenuComponent;
};



export function contextMenuStack<T>(defs: (ContextMenuItemDef<T> | React.FC<ContextMenuItemProps<T>>)[]): React.FC<ContextMenuItemProps<T>>[] {
    return defs.map(e => typeof e == "function" ? e : createContextMenu(e));
}
