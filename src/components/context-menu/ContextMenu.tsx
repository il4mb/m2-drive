"use client"

import { Box, Stack, Divider, alpha } from "@mui/material";
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
    useMemo,
    useCallback,
    Fragment
} from "react";
import { createPortal } from "react-dom";
import { ContextMenuItemProps } from "./ContextMenuItem";
import { Unsubscribe } from "@/types/global";
import { generateKey } from "@/libs/utils";

type MenuComponent = React.FC<ContextMenuItemProps<any>>;

export interface ContextMenuProps<T> {
    children?: ReactElement;
    header?: ReactNode;
    menu?: Record<string, MenuComponent>;
    state?: T;
    highlight?: boolean;
    maxWidth?: number;
    minWidth?: number;
    disabled?: boolean;
    submenuOffset?: number;
    enableKeyboardNavigation?: boolean;
    backdropBlur?: boolean;
    animationDuration?: number;
}

// Default values
const DEFAULT_MAX_WIDTH = 220;
const DEFAULT_MIN_WIDTH = 140;
const DEFAULT_SUBMENU_OFFSET = 4;
const DEFAULT_ANIMATION_DURATION = 0.15;

// Estimate menu dimensions
const ESTIMATED_ITEM_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 48;
const HORIZONTAL_PADDING = 16;
const VERTICAL_PADDING = 8;
const MARGIN = 8;

interface SubmenuState {
    id: string;
    position: { x: number; y: number };
    parentRect?: DOMRect;
}

function getPortalRoot() {
    let portalRoot = document.getElementById("context-menu-root");
    if (!portalRoot) {
        portalRoot = document.createElement("div");
        portalRoot.id = "context-menu-root";
        portalRoot.style.position = "fixed";
        portalRoot.style.top = "0";
        portalRoot.style.left = "0";
        portalRoot.style.zIndex = "1200";
        portalRoot.style.pointerEvents = "none";
        document.body.appendChild(portalRoot);
    }
    return portalRoot;
}

export default function ContextMenu<T>({
    children,
    header,
    menu: initialMenu,
    state: initialState,
    highlight = false,
    maxWidth = DEFAULT_MAX_WIDTH,
    minWidth = DEFAULT_MIN_WIDTH,
    disabled = false,
    submenuOffset = DEFAULT_SUBMENU_OFFSET,
    enableKeyboardNavigation = true,
    backdropBlur = false,
    animationDuration = DEFAULT_ANIMATION_DURATION
}: ContextMenuProps<T>) {

    const [additionalPortalRender, setAdditionalPortalRender] = useState<Map<string, ReactNode>>(new Map());
    const [stateMap, setStateMap] = useState<Map<string, any>>(new Map());
    const state = useMemo(() => Object.assign({}, ...stateMap.values()), [stateMap]);

    const [menuMap, setMenuMap] = useState<Map<string, MenuComponent[]>>(new Map());
    const menu = useMemo<MenuComponent[]>(() =>
        Array.from(menuMap.values()).flat(), [menuMap]);

    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<SubmenuState | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const menuRef = useRef<HTMLDivElement>(null);
    const submenuTimerRef = useRef<NodeJS.Timeout>(null);
    const portalRootEl = typeof window !== "undefined" ? getPortalRoot() : null;

    // Calculate estimated menu dimensions
    const estimatedDimensions = useMemo(() => {
        const itemCount = menu?.length || 0;
        const hasHeader = Boolean(header);

        const estimatedHeight = (hasHeader ? ESTIMATED_HEADER_HEIGHT : 0) +
            (itemCount * ESTIMATED_ITEM_HEIGHT) +
            VERTICAL_PADDING * 2;

        return {
            width: Math.max(minWidth, Math.min(maxWidth, maxWidth)),
            height: estimatedHeight
        };
    }, [menu?.length, header, maxWidth, minWidth]);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        if (disabled) return;

        e.preventDefault();
        e.stopPropagation();
        if (!menu?.length) return;

        setPosition({ x: e.clientX, y: e.clientY });
        setFocusedIndex(-1);
        setActiveSubmenu(null);
    }, [disabled, menu?.length]);

    const onClose = useCallback(() => {
        setPosition(null);
        setAdjustedPosition(null);
        setActiveSubmenu(null);
        setFocusedIndex(-1);
    }, []);

    const addState = useCallback((data: any): Unsubscribe => {
        const id = generateKey();
        setStateMap(prev => {
            const map = new Map(prev);
            map.set(id, data);
            return map;
        });
        return () => {
            setStateMap(prev => {
                const map = new Map(prev);
                map.delete(id);
                return map;
            });
        };
    }, []);

    const addMenu = useCallback((id: string, menuItems: MenuComponent | MenuComponent[]): Unsubscribe => {
        const itemsArray = Array.isArray(menuItems) ? menuItems : [menuItems];

        setMenuMap(prev => {
            const map = new Map(prev);
            map.set(id, itemsArray);
            return map;
        });

        return () => {
            setMenuMap(prev => {
                const map = new Map(prev);
                map.delete(id);
                return map;
            });
        };
    }, []);

    const addRender = useCallback((id: string, node: ReactNode) => {
        setAdditionalPortalRender(prev => {
            const map = new Map(prev);
            map.set(id, node);
            return map;
        });

        return () => {
            setAdditionalPortalRender(prev => {
                const map = new Map(prev);
                map.delete(id);
                return map;
            });
        };
    }, []);


    const removeRender = useCallback((id: string) => {
        setAdditionalPortalRender(prev => {
            const map = new Map(prev);
            if (map.has(id)) {
                map.delete(id);
            }
            return map;
        });
    }, []);



    // Calculate adjusted position with boundary checking
    const calculateAdjustedPosition = useCallback((pos: { x: number; y: number }, dimensions: { width: number; height: number }) => {
        let x = pos.x;
        let y = pos.y;

        // Adjust for right edge
        if (x + dimensions.width > window.innerWidth - MARGIN) {
            x = window.innerWidth - dimensions.width - MARGIN;
        }

        // Adjust for bottom edge
        if (y + dimensions.height > window.innerHeight - MARGIN) {
            y = window.innerHeight - dimensions.height - MARGIN;
        }

        // Ensure minimum position
        x = Math.max(MARGIN, x);
        y = Math.max(MARGIN, y);

        return { x, y };
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!position || !enableKeyboardNavigation) return;

        switch (e.key) {
            case "Escape":
                onClose();
                break;
            case "ArrowDown":
                e.preventDefault();
                setFocusedIndex(prev =>
                    prev < menu.length - 1 ? prev + 1 : 0
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setFocusedIndex(prev =>
                    prev > 0 ? prev - 1 : menu.length - 1
                );
                break;
            case "ArrowRight":
                e.preventDefault();
                // Open submenu if available
                if (focusedIndex >= 0 && focusedIndex < menu.length) {
                    const menuItem = menu[focusedIndex];
                    // Check if menu item has submenu (you'll need to implement this logic)
                }
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < menu.length) {
                    // Trigger menu item action
                    const menuElement = menuRef.current?.children[header ? focusedIndex + 1 : focusedIndex] as HTMLElement;
                    menuElement?.click();
                }
                break;
        }
    }, [position, enableKeyboardNavigation, menu, focusedIndex, header, onClose]);

    // Sync initial state
    useEffect(() => {
        return addState(initialState);
    }, [initialState, addState]);

    // Sync initial menu
    useEffect(() => {
        if (!initialMenu) return;
        const unsubscribers = Object.entries(initialMenu).map(([id, menu]) => addMenu(id, menu));
        return () => unsubscribers.forEach(unsub => unsub());
    }, [initialMenu, addMenu]);

    // Adjust position based on window boundaries
    useEffect(() => {
        if (!position) return;

        const adjusted = calculateAdjustedPosition(position, estimatedDimensions);
        setAdjustedPosition(adjusted);
    }, [position, estimatedDimensions, calculateAdjustedPosition]);

    // // Add event listeners
    // useEffect(() => {
    //     if (!position) return;

    //     document.addEventListener("keydown", handleKeyDown);
    //     document.addEventListener("click", onClose);

    //     return () => {
    //         document.removeEventListener("keydown", handleKeyDown);
    //         document.removeEventListener("click", onClose);
    //     };
    // }, [position, handleKeyDown, onClose]);

    // Clear submenu timer on unmount
    useEffect(() => {
        return () => {
            if (submenuTimerRef.current) {
                clearTimeout(submenuTimerRef.current);
            }
        };
    }, []);

    if (!children || !isValidElement(children)) return null;

    const content = cloneElement(children, {
        // @ts-ignore
        onContextMenu,
        style: {
            // @ts-ignore
            ...children.props.style,
            ...(highlight && position && {
                backgroundColor: alpha("#000", 0.1),
                borderRadius: "4px"
            })
        }
    });

    const renderMenu = (menuItems: MenuComponent[], menuPosition: { x: number; y: number }, isSubmenu = false) => (
        <Stack
            ref={isSubmenu ? undefined : menuRef}
            component={motion.div}
            initial={{ scale: 0.95, opacity: 0, x: isSubmenu ? 10 : 0 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.95, opacity: 0, x: isSubmenu ? 10 : 0 }}
            transition={{ duration: animationDuration }}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
                position: "fixed",
                top: menuPosition.y,
                left: menuPosition.x,
                zIndex: isSubmenu ? 1301 : 1300,
                bgcolor: "background.paper",
                borderRadius: 1.5,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
                maxWidth,
                minWidth,
                width: 'auto',
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
            {header && !isSubmenu && (
                <>
                    <Box sx={{
                        p: 1.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        typography: "body2",
                        color: "text.secondary",
                        fontWeight: 500
                    }}>
                        {header}
                    </Box>
                    <Divider />
                </>
            )}

            {menuItems.map((MenuItem, index) => (
                <Box
                    key={index}
                    sx={{
                        borderRadius: 1,
                        '&:hover': {
                            bgcolor: 'action.hover'
                        },
                        '&:focus': {
                            bgcolor: 'action.selected',
                            outline: 'none'
                        },
                        pointerEvents: 'auto'
                    }}>
                    <MenuItem
                        state={state}
                        onClose={onClose}
                    // isFocused={focusedIndex === index}
                    // hasSubmenu={false} // You'll need to implement submenu detection
                    // onSubmenuOpen={(rect) => {
                    //     // Handle submenu opening
                    //     const submenuPosition = {
                    //         x: menuPosition.x + rect.width + submenuOffset,
                    //         y: menuPosition.y + rect.top
                    //     };
                    //     setActiveSubmenu({
                    //         id: `submenu-${index}`,
                    //         position: calculateAdjustedPosition(submenuPosition, estimatedDimensions),
                    //         parentRect: rect
                    //     });
                    // }}
                    // onSubmenuClose={() => {
                    //     setActiveSubmenu(null);
                    // }}
                    />
                </Box>
            ))}
        </Stack>
    );

    return (
        <Context.Provider value={{ state, addState, addMenu, addRender, removeRender }}>
            {content}
            {portalRootEl && createPortal(
                <AnimatePresence>
                    {adjustedPosition && (
                        <>
                            {/* Backdrop */}
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={onClose}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose();
                                }}
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
                                    bgcolor: 'transparent',
                                    backdropFilter: backdropBlur ? 'blur(2px)' : 'none',
                                    WebkitBackdropFilter: backdropBlur ? 'blur(2px)' : 'none'
                                }}
                            />

                            {/* Main menu */}
                            {renderMenu(menu, adjustedPosition)}

                            {/* Submenu */}
                            {activeSubmenu && (
                                <AnimatePresence>
                                    {renderMenu([], activeSubmenu.position, true)}
                                </AnimatePresence>
                            )}
                        </>
                    )}

                    {Array.from(additionalPortalRender.entries()).map(([id, node]) => (
                        <Fragment key={id}>
                            {node}
                        </Fragment>
                    ))}
                </AnimatePresence>,
                portalRootEl
            )}
        </Context.Provider>
    );
}

type StateContext<T> = {
    addRender: (id: string, node: ReactNode) => Unsubscribe;
    removeRender: (id: string) => void;
    addState: (data: any) => Unsubscribe;
    addMenu: (id: string, menu: MenuComponent | MenuComponent[]) => Unsubscribe;
    state: T;
    openSubmenu?: (id: string, position: { x: number; y: number }, parentRect?: DOMRect) => void;
    closeSubmenu?: () => void;
}

const Context = createContext<StateContext<Record<string, any>>>({} as any);

export function useContextMenu<T = Record<string, any>>() {
    const context = useContext<StateContext<T>>(Context as any);
    if (!context) {
        throw new Error("useContextMenu must be used within a ContextMenu");
    }
    return context;
}

export const useContextMenuState = <T,>() => {
    const contextMenu = useContextMenu<T>();
    return contextMenu.state;
}