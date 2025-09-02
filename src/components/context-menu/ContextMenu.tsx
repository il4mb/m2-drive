"use client"

import { Box, Stack } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import {
    cloneElement,
    createContext,
    isValidElement,
    ReactElement,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
    useMemo
} from "react";
import { createPortal } from "react-dom";
import { ContextMenuItemProps } from "./ContextMenuItem";

export interface ContextMenuProps<T> {
    children?: ReactElement;
    header?: ReactNode;
    menu?: React.FC<ContextMenuItemProps<T>>[];
    state: T;
    highlight?: boolean;
    maxWidth?: number;
    disabled?: boolean;
}

// Estimate menu dimensions based on content
const ESTIMATED_ITEM_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 48;
const HORIZONTAL_PADDING = 16;
const VERTICAL_PADDING = 8;

function getPortalRoot() {
    let portalRoot = document.getElementById("context-menu-root");
    if (!portalRoot) {
        portalRoot = document.createElement("div");
        portalRoot.id = "context-menu-root";
        portalRoot.style.position = "relative";
        portalRoot.style.zIndex = "800";
        document.body.appendChild(portalRoot);
    }
    return portalRoot;
}

export default function ContextMenu<T>({
    children,
    header,
    menu,
    state,
    highlight = false,
    maxWidth = 190,
    disabled = false
}: ContextMenuProps<T>) {

    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Calculate estimated menu dimensions
    const estimatedDimensions = useMemo(() => {
        const itemCount = menu?.length || 0;
        const hasHeader = Boolean(header);

        const estimatedHeight = (hasHeader ? ESTIMATED_HEADER_HEIGHT : 0) +
            (itemCount * ESTIMATED_ITEM_HEIGHT) +
            VERTICAL_PADDING * 2;

        return {
            width: maxWidth,
            height: estimatedHeight
        };
    }, [menu?.length, header, maxWidth]);

    const onContextMenu = (e: React.MouseEvent) => {
        if (disabled) return;

        e.preventDefault();
        e.stopPropagation();
        if (!menu?.length) return;

        setPosition({ x: e.clientX, y: e.clientY });
    };

    const onClose = () => {
        setPosition(null);
        setAdjustedPosition(null);
    };

    // Calculate adjusted position based on estimated dimensions
    useEffect(() => {
        if (!position) return;

        const margin = 8;
        const { width, height } = estimatedDimensions;

        let x = position.x;
        let y = position.y;

        // Adjust for right edge
        if (x + width > window.innerWidth - margin) {
            x = window.innerWidth - width - margin;
        }

        // Adjust for bottom edge
        if (y + height > window.innerHeight - margin) {
            y = window.innerHeight - height - margin;
        }

        // Ensure minimum position
        x = Math.max(margin, x);
        y = Math.max(margin, y);

        setAdjustedPosition({ x, y });
    }, [position, estimatedDimensions]);

    // Close on escape key
    useEffect(() => {
        if (!position) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [position]);

    // // Close on scroll
    // useEffect(() => {
    //     if (!position) return;

    //     const handleScroll = () => onClose();
    //     window.addEventListener("scroll", handleScroll, { capture: true });

    //     return () => window.removeEventListener("scroll", handleScroll, { capture: true });
    // }, [position]);

    // Optional: Fine-tune position after menu actually renders
    useEffect(() => {
        if (!adjustedPosition || !menuRef.current) return;

        const menuRect = menuRef.current.getBoundingClientRect();
        const margin = 8;

        let needsAdjustment = false;
        let newX = adjustedPosition.x;
        let newY = adjustedPosition.y;

        // Check right edge
        if (newX + menuRect.width > window.innerWidth - margin) {
            newX = window.innerWidth - menuRect.width - margin;
            needsAdjustment = true;
        }

        // Check bottom edge
        if (newY + menuRect.height > window.innerHeight - margin) {
            newY = window.innerHeight - menuRect.height - margin;
            needsAdjustment = true;
        }

        if (needsAdjustment) {
            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [adjustedPosition]);

    if (!children || !isValidElement(children)) return null;

    const content = cloneElement(children, {
        // @ts-ignore
        onContextMenu,
        style: {
            // @ts-ignore
            ...children.props.style,
            ...(highlight && position && {
                backgroundColor: "rgba(100, 100, 100, 0.2)",
                borderRadius: "4px"
            })
        }
    });

    const portalRootEl = typeof window !== "undefined" ? getPortalRoot() : null;

    return (
        <Context.Provider value={state}>
            {content}
            {portalRootEl &&
                createPortal(
                    <AnimatePresence>
                        {adjustedPosition && (
                            <>
                                <Stack
                                    ref={menuRef}
                                    component={motion.div}
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onContextMenu={(e) => e.preventDefault()}
                                    sx={{
                                        position: "fixed",
                                        top: adjustedPosition.y,
                                        left: adjustedPosition.x,
                                        zIndex: 1300,
                                        bgcolor: "background.paper",
                                        borderRadius: 1.5,
                                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                                        maxWidth,
                                        minWidth: 120,
                                        width: '100%',
                                        overflow: "hidden",
                                        p: 0.5,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        gap: 0.25,
                                        "&:focus": {
                                            outline: "none"
                                        }
                                    }}
                                    tabIndex={-1}>
                                    {header && (
                                        <Box sx={{
                                            p: 1,
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                            typography: "body2",
                                            color: "text.secondary"
                                        }}>
                                            {header}
                                        </Box>
                                    )}
                                    {(menu || []).map((Child, i) => (
                                        <Child
                                            key={i}
                                            state={state}
                                            onClose={onClose}
                                        />
                                    ))}
                                </Stack>
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    onClick={onClose}
                                    sx={{
                                        position: "fixed",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        width: "100%",
                                        height: "100%",
                                        pointerEvents: 'all',
                                        zIndex: 1299,
                                        bgcolor: 'transparent'
                                    }}
                                />
                            </>
                        )}
                    </AnimatePresence>,
                    portalRootEl
                )}
        </Context.Provider>
    );
}

const Context = createContext<any>({});
export function useContextMenuState<T>() {
    const context = useContext<T>(Context);
    if (!context) {
        throw new Error("useContextMenuState must be used within a ContextMenu");
    }
    return context;
}