'use client'

import { IconButton, Paper, Stack, Typography, useMediaQuery, Popover, Box, PaperProps, PopoverProps } from '@mui/material';
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback } from 'react';
import SidebarDrawer from './SidebarDrawer';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { isEqual } from 'lodash';

interface MobileAction {
    id: string;
    icon: ReactNode;
    component: ReactNode;
    showAsPopover?: boolean;
    position?: number;
    slotProps?: {
        popover?: PopoverProps
    }
}

interface State {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    mobileActions: MobileAction[];
    addMobileAction: (action: MobileAction) => void;
    removeMobileAction: (id: string) => void;
    activeAction: string | null;
    setActiveAction: Dispatch<SetStateAction<string | null>>;
}

const Context = createContext<State | undefined>(undefined);

type SidebarProviderProps = {
    children?: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
    const [open, setOpen] = useState<boolean>(true);
    const [mobileActions, setMobileActions] = useState<MobileAction[]>([]);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('md'));
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

    const addMobileAction = useCallback((action: MobileAction) => {
        setMobileActions(prev => {
            const existingIndex = prev.findIndex(a => a.id === action.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = action;
                return updated;
            }
            return [...prev, action].sort((a, b) => (a.position || 0) - (b.position || 0));
        });
    }, []);

    const removeMobileAction = useCallback((id: string) => {
        setMobileActions(prev => prev.filter(action => action.id !== id));
    }, []);

    const handleActionClick = (event: React.MouseEvent<HTMLElement>, action: MobileAction) => {
        if (action.showAsPopover) {
            setPopoverAnchor(event.currentTarget);
            setActiveAction(action.id);
        } else {
            setActiveAction(activeAction === action.id ? null : action.id);
        }
    };

    const handleClosePopover = () => {
        setPopoverAnchor(null);
        setActiveAction(null);
    };

    return (
        <Context.Provider value={{
            open,
            setOpen,
            mobileActions,
            addMobileAction,
            removeMobileAction,
            activeAction,
            setActiveAction
        }}>
            <Stack flex={1} overflow={'hidden'} component={motion.div}>
                <Stack component={Paper} display={['flex', 'flex', 'none']} borderRadius={0} p={1} boxShadow={2} zIndex={1195}>
                    <AnimatePresence>
                        <Stack
                            key={'header'}
                            sx={{ height: 50, gap: 2, display: 'flex' }}
                            alignItems={"center"}
                            justifyContent={"space-between"}
                            direction={'row'}>
                            <Stack direction={"row"} alignItems={"center"} spacing={1}>
                                <IconButton onClick={() => setOpen(prev => !prev)}>
                                    {open ? <X size={18} /> : <Menu size={18} />}
                                </IconButton>
                                <Typography fontSize={18} fontWeight={600}>
                                    M2 Drive
                                </Typography>
                            </Stack>

                            {/* Mobile Actions */}
                            {isMobile && mobileActions.length > 0 && (
                                <Stack direction="row" alignItems="center" gap={1}>
                                    {mobileActions.map((action) => (
                                        action.icon
                                            ? (
                                                <IconButton
                                                    key={action.id}
                                                    onClick={(e) => handleActionClick(e, action)}
                                                    color={activeAction === action.id ? "primary" : "default"}>
                                                    {action.icon}
                                                </IconButton>
                                            )
                                            : action.component
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                        {isMobile && mobileActions.map(action => (!action.showAsPopover && activeAction === action.id && (
                            <Box component={motion.div}
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                p={1} key={action.id}>
                                {action.component}
                            </Box>
                        )))}
                    </AnimatePresence>
                </Stack>

                <Stack flex={1} gap={[0, 0, 1]} overflow={'hidden'} direction={'row'}>
                    <SidebarDrawer />
                    <Stack
                        flex={1}
                        sx={{
                            minWidth: 'min(calc(100dvw - 85px), 800px)',
                            position: 'relative'
                        }}>
                        {children}
                    </Stack>
                </Stack>

                {/* Popover for popover-style actions */}
                {isMobile && mobileActions.map(action => (
                    action.showAsPopover && (
                        <Popover
                            key={action.id}
                            open={activeAction === action.id && Boolean(popoverAnchor)}
                            anchorEl={popoverAnchor}
                            onClose={handleClosePopover}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            {...action.slotProps?.popover}>
                            <Box sx={{ p: 2, minWidth: 200 }}>
                                {action.component}
                            </Box>
                        </Popover>
                    )
                ))}
            </Stack>
        </Context.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(Context);
    if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
    return context;
};