"use client"

import { Box, Stack } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { Children, cloneElement, Fragment, isValidElement, ReactElement, ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { ContextMenuItemProps } from "./ContextMenuItem";

export interface ContextMenuProps<T> {
    children?: ReactElement;
    header?: ReactNode;
    menu?: React.FC<ContextMenuItemProps<T>>[];
    payload: T;
    highlight?: boolean;
    maxWidth?: number;
}

function getPortalRoot() {
    if (document.getElementById("context-menu-root")) {
        return document.getElementById("context-menu-root");
    }
    const portalRoot = document.createElement("div");
    portalRoot.id = "context-menu-root";
    document.body.appendChild(portalRoot);
    return portalRoot;
}

export default function ContextMenu<T>({
    children,
    header,
    menu = [],
    payload,
    highlight = false,
    maxWidth = 190
}: ContextMenuProps<T>) {

    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const open = Boolean(position);

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (menu.length == 0) return;
        setPosition({ x: e.clientX, y: e.clientY });
    };

    const onClose = () => setPosition(null);

    if (!children || !isValidElement(children)) return null;

    const content = cloneElement(children, {
        // @ts-ignore
        onContextMenu,
        style: {
            ...(highlight && open && {
                background: "rgba(100, 100, 100, 0.2)"
            })
        }
    });
    const portalRootEl = typeof window !== "undefined" ? getPortalRoot() : null;

    return (
        <>
            {content}
            {portalRootEl &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <>
                                <Stack
                                    component={motion.div}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 10, opacity: 0 }}
                                    onContextMenu={(e) => e.preventDefault()}
                                    sx={{
                                        position: "fixed",
                                        top: position?.y,
                                        left: position?.x,
                                        zIndex: 1300,
                                        bgcolor: "background.paper",
                                        borderRadius: 2,
                                        boxShadow: 3,
                                        maxWidth,
                                        width: "100%",
                                        overflow: "hidden",
                                        p: 1,
                                        border: "1px solid",
                                        borderColor: "rgba(100, 100, 100, 0.5)",
                                        gap: 0.5,
                                    }}>
                                    {header}
                                    {menu.map((Child, i) => (
                                        <Child
                                            key={i}
                                            payload={payload}
                                            onClose={onClose} />
                                    ))}
                                </Stack>
                                <Box
                                    onContextMenu={(e) => (e.preventDefault(), e.stopPropagation(), setPosition(null))}
                                    onClick={onClose}
                                    sx={{
                                        position: "fixed",
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        width: "100%",
                                        height: "100%",
                                        pointerEvents: 'all',
                                        zIndex: 1299,
                                    }} />
                            </>
                        )}
                    </AnimatePresence>,
                    portalRootEl
                )}
        </>
    );
}
