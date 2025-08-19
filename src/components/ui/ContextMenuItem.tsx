'use client'

import { IFiles } from '@/entity/File';
import { MenuItem, ListItemIcon, ListItemText, Stack, SxProps } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import React, { ReactNode, useState } from 'react';

export interface ContextMenuItemProps<T> {
    payload: T;
    onClose: () => void;
    children?: ReactNode;
}

export function ContextMenuItem<T>({ children }: ContextMenuItemProps<T>) {
    return <MenuItem>{children}</MenuItem>;
}

export type ContextMenuItemDef<T, S> = {
    state?: (payload: T) => S,
    icon?: React.FC<{ className?: string, size?: number, payload: T }>;
    label: string | React.FC<{ payload: T, state: S }>;
    action?: (this: S, payload: T) => void | boolean | Promise<void | boolean>;
    component?: React.FC<{ payload: T, state: S, resolve: (close?: boolean) => void; }>;
    style?: ((payload: T) => (SxProps | false | null | undefined)) | SxProps;
}

/**
 * Factory for building context menu items.
 */
export function createContextMenu<T, S = unknown>(def: ContextMenuItemDef<T, S>): React.FC<ContextMenuItemProps<T>> {

    const MenuComponent: React.FC<ContextMenuItemProps<T>> = ({ payload, onClose }) => {

        const state = (def.state?.(payload) || {}) as S;
        const Component = def.component;
        const Icon = def.icon;
        const [pending, setPending] = useState(false);

        const handleClick = async () => {
            if (pending) return;
            setPending(true);
            try {
                const exit = await def.action?.call(state, payload);
                if (typeof exit != "boolean" || exit == true) {
                    onClose();
                }
            } catch (e) {
                console.log(e);
            } finally {
                setPending(false);
            }
        };

        const resolve = (close = true) => {
            setPending(false);
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
                            ...(def.action && {
                                bgcolor: "action.hover"
                            })
                        },
                        ...(typeof def.style == "function" ? def.style(payload as any) : def.style),
                        ...(pending && {
                            bgcolor: "action.hover"
                        })
                    }}
                    onClick={handleClick}>
                    {Icon && (
                        <ListItemIcon>
                            {pending
                                ? <RefreshCw size={14} className="animate-spin" />
                                : <Icon size={14} payload={payload} />}
                        </ListItemIcon>
                    )}
                    <ListItemText>
                        {typeof def.label == "string"
                            ? def.label
                            : <def.label payload={payload} state={state} />}
                    </ListItemText>
                </Stack>
                {pending && Component && (
                    <Component
                        payload={payload}
                        state={state}
                        resolve={resolve} />
                )}
            </>
        );
    };

    MenuComponent.displayName = `ContextMenu(${def.label})`;
    return MenuComponent;
};

// Example action
export const ActionRename = createContextMenu<{ file: IFiles }>({
    icon: (props) => <span {...props}>📝</span>, // replace with lucide-react icon
    label: 'Rename',
    async action({ file }) {
        const newName = prompt('Enter new name', file.name);
        if (newName && newName !== file.name) {
            // call API or update state
            console.log(`Renaming ${file.name} → ${newName}`);
            await new Promise((res) => setTimeout(res, 500)); // fake async
            // refresh();
        }
    },
});
