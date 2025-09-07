'use client'

import { MenuItem, ListItemIcon, ListItemText, Stack, SxProps, Typography } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import React, { ReactNode } from 'react';

export interface ContextMenuItemProps<T> {
    state: T;
    onClose: () => void;
    children?: ReactNode;
}

export function ContextMenuItem<T>({ children }: ContextMenuItemProps<T>) {
    return <MenuItem>{children}</MenuItem>;
}

export type ContextMenuItemDef<T, S> = {
    state?: (p: T) => S;
    icon?: React.FC<{ className?: string; size?: number; state: T & S }>;
    fallbackIcon?: React.FC<{ className?: string; size?: number; state: T & S }>;
    label: string | React.FC<{ state: T & S }>;
    action?: (state: T & S) => void | boolean | Promise<void | boolean>;
    component?: React.FC<{ state: T & S; resolve: (close?: boolean) => void; anchor: HTMLElement | null }>;
    style?: (state: T & S) => (SxProps | false | null | undefined);
    show?: boolean | ((state: T & S) => boolean);
};

export function createContextMenu<
    T,
    S = any,
    Def extends ContextMenuItemDef<T, S> = ContextMenuItemDef<T, S>
>(
    def: Def & {
        state?: (p: T) => S;
    }
): React.FC<ContextMenuItemProps<T & S>> {

    const MenuComponent: React.FC<ContextMenuItemProps<T & S>> = ({ state, onClose }) => {

        const additional = def.state?.(state);
        const Component = def.component;
        const Icon = def.icon;
        const [pending, setPending] = React.useState(false);
        const [open, setOpen] = React.useState(false);
        const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
        const [visible, setVisible] = React.useState(
            typeof def.show === "undefined" ? true : Boolean(def.show)
        );

        const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
            try {
                if (def.action) {
                    if (pending) return;
                    setPending(true);
                    const exit = await def.action?.({ ...state, ...additional });
                    if (typeof exit !== "boolean" || exit) {
                        onClose();
                    }
                } else if (Component) {
                    setAnchor(e.currentTarget);
                    setOpen(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setPending(false);
            }
        };

        const resolve = (close = true) => {
            setPending(false);
            setOpen(false);
            setAnchor(null);
            if (close) onClose();
        };

        React.useEffect(() => {
            if (typeof def.show === "function") {
                setVisible(def.show({ ...state, ...additional }));
            } else if (typeof def.show === "boolean") {
                setVisible(def.show);
            }
        }, [state, additional, def.show]);

        if (!visible) return null;

        return (
            <>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClick(e);
                    }}
                    sx={{
                        px: 1,
                        py: 0.8,
                        cursor: "pointer",
                        borderRadius: 1,
                        userSelect: "none",
                        width: "100%",
                        "&:hover": (def.action || def.component) && { bgcolor: "action.hover" },
                        ...(typeof def.style === "function" ? def.style(state) : def.style),
                        ...((pending || open) && { bgcolor: "action.hover" }),
                    }}
                    onClick={handleClick}>
                    {Icon && (
                        <ListItemIcon>
                            {pending ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Icon size={14} state={{ ...state, ...additional }} />
                            )}
                        </ListItemIcon>
                    )}
                    <ListItemText sx={{ overflow: "hidden" }}>
                        <Typography component="div" overflow="hidden" textOverflow="ellipsis">
                            {typeof def.label === "string" ? def.label : <def.label state={{ ...state, ...additional }} />}
                        </Typography>
                    </ListItemText>
                </Stack>

                {open && Component && (
                    <Component
                        state={{ ...state, ...additional }}
                        resolve={resolve}
                        anchor={anchor} />
                )}
            </>
        );
    };

    MenuComponent.displayName = `ContextMenu(${typeof def.label === "string" ? def.label : "Custom"})`;
    return MenuComponent;
}




export function contextMenuStack<T, S = any>(
    defs: Record<string, ContextMenuItemDef<T, S> | React.FC<ContextMenuItemProps<T>>>
): Record<string, React.FC<ContextMenuItemProps<T>>> {
    return Object.fromEntries(
        Object.entries(defs).map(([id, menu]) => [id, typeof menu == "function" ? menu : createContextMenu(menu)])
    ) as Record<string, React.FC<ContextMenuItemProps<T>>>;
}
