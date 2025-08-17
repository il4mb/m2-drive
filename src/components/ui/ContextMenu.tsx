"use client"

import { Box, Stack } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { Children, cloneElement, Fragment, isValidElement, ReactElement, ReactNode, useState } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuProps {
    children?: ReactElement;
    header?: ReactNode;
    items?: ReactElement | ReactElement[];
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

export default function ContextMenu({ children, header, items }: ContextMenuProps) {

    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const open = Boolean(position);

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setPosition({ x: e.clientX, y: e.clientY });
    };

    const onClose = () => setPosition(null);

    if (!children || !isValidElement(children)) return null;

    const content = cloneElement(children, {
        // @ts-ignore
        onContextMenu,
        style: {
            background: open ? "rgba(100, 100, 100, 0.2)" : ""
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
                                        maxWidth: 190,
                                        width: "100%",
                                        overflow: "hidden",
                                        p: 1,
                                        border: "1px solid",
                                        borderColor: "rgba(100, 100, 100, 0.5)"
                                    }}>
                                    {header}
                                    {Children.map(items, (child, i) => (
                                        <Fragment key={i}>
                                            {cloneElement(child as any, {
                                                onClose
                                            } as any)}
                                        </Fragment>
                                    ))}
                                </Stack>
                                <Box
                                    onContextMenu={(e) => (e.preventDefault(), setPosition(null))}
                                    onClick={onClose}
                                    sx={{
                                        position: "fixed",
                                        top: 0, left: 0, right: 0, bottom: 0,
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
