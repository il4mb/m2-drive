'use client'

import { Breakpoint, PopoverProps, useMediaQuery, useTheme } from '@mui/material';
import { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';

interface Action {
    id: string;
    icon: ReactNode;
    component: ReactNode;
    showAsPopover?: boolean;
    position?: number;
    breakpoin?: Breakpoint;
    slotProps?: {
        popover?: PopoverProps
    }
}

interface StateProps {
    actions: [string, Action][];
    addAction: (id: string, action: Action) => void;
    removeAction: (id: string) => void;
    hasAction: (id: string) => boolean;
}

const Context = createContext<StateProps | undefined>(undefined);

export const ActionsProvider = ({ children }: { children?: ReactNode }) => {

    const [actionsMap, setActionsMap] = useState<Map<string, Action>>(new Map());
    const actions = useMemo(() => Array.from(actionsMap.entries()), [actionsMap]);

    const addAction = useCallback((id: string, action: Action) => {
        setActionsMap(prev => {
            const map = new Map(prev);
            map.set(id, action);
            return map;
        })
    }, []);

    const removeAction = useCallback((id: string) => {
        setActionsMap(prev => {
            const map = new Map(prev);
            if (map.has(id)) map.delete(id);
            return map;
        })
    }, []);

    const contextValue = useMemo<StateProps>(() => ({
        actions,
        addAction,
        removeAction,
        hasAction: (id) => actionsMap.has(id)
    }), [actionsMap, addAction, removeAction]);

    return (
        <Context.Provider value={contextValue}>
            {children}
        </Context.Provider>
    );
};



export const useActionsProvider = () => useContext(Context);
export const useActionsByBreakpoint = (min: Breakpoint, max?: Breakpoint) => {
    const theme = useTheme();

    // Check if viewport is >= min and (if max provided) <= max
    const minMatch = useMediaQuery(theme.breakpoints.up(min));
    const maxMatch = max ? useMediaQuery(theme.breakpoints.down(max)) : true;

    const matches = minMatch && maxMatch;

    const actionsProvider = useActionsProvider();

    const actions = useMemo(() => {
        if (!matches || !actionsProvider) return [];
        return actionsProvider.actions.filter(([_, action]) => {
            if (!action.breakpoin) return true;
            return (
                theme.breakpoints.keys.indexOf(action.breakpoin) >= theme.breakpoints.keys.indexOf(min) &&
                (!max ||
                    theme.breakpoints.keys.indexOf(action.breakpoin) <= theme.breakpoints.keys.indexOf(max))
            );
        }).sort((a, b) => (a[1].position || 0) - (b[1].position || 0))
    }, [matches, actionsProvider, min, max, theme.breakpoints.keys]);

    // Remove actions when breakpoint no longer matches
    useEffect(() => {
        if (!matches && actionsProvider && actions.length) {
            actions.forEach(([id]) => {
                actionsProvider.removeAction(id);
            });
        }
    }, [matches, actions, actionsProvider]);

    return actions;
};