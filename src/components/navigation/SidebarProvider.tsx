'use client'

import { IconButton, Paper, Stack, Typography, useMediaQuery, Popover, Box } from '@mui/material';
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useMemo, createElement, Fragment } from 'react';
import SidebarDrawer from './SidebarDrawer';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Action, useActionsProvider } from './ActionsProvider';

interface State {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    activeAction: string | null;
    setActiveAction: Dispatch<SetStateAction<string | null>>;
}

const Context = createContext<State | undefined>(undefined);

type SidebarProviderProps = {
    children?: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {


    const actionsProvider = useActionsProvider();
    const [open, setOpen] = useState<boolean>(true);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('md'));
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
    const actions = useMemo(() => isMobile ? actionsProvider.actions : [], [actionsProvider.actions, isMobile]);

    const handleActionClick = (event: React.MouseEvent<HTMLElement>, action: Action) => {
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
        <Context.Provider value={{ open, setOpen, activeAction, setActiveAction }}>
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
                            {isMobile && actions.length > 0 && (
                                <Stack direction="row" alignItems="center" gap={1}>
                                    {actions.map(([id, action]) => (
                                        <Fragment key={id}>
                                            {action.icon
                                                ? (
                                                    <IconButton
                                                        key={action.id}
                                                        onClick={(e) => handleActionClick(e, action)}
                                                        color={activeAction === action.id ? "primary" : "default"}>
                                                        {action.icon}
                                                    </IconButton>
                                                )
                                                : typeof action.component == "function" ? createElement(action.component) : action.component}
                                        </Fragment>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                        {isMobile && actions.map(([id, action]) => (!action.showAsPopover && activeAction === action.id && (
                            <Box component={motion.div}
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                p={1} key={id}>
                                {typeof action.component == "function" ? createElement(action.component) : action.component}
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
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                        {children}
                    </Stack>
                </Stack>

                {/* Popover for popover-style actions */}
                {isMobile && actions.map(([id, action]) => (
                    action.showAsPopover && (
                        <Popover
                            key={id}
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
                                {typeof action.component == "function" ? createElement(action.component) : action.component}
                            </Box>
                        </Popover>
                    )
                ))}
            </Stack>
        </Context.Provider>
    );
};

export const useSidebar = () => useContext(Context);