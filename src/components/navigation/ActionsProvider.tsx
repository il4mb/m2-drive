'use client'

import { Breakpoint, PopoverProps, useMediaQuery, useTheme } from '@mui/material';
import { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';

export interface Action {
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
    addAction: (id: string, action: Omit<Action, 'id'>) => void;
    removeAction: (id: string) => void;
    hasAction: (id: string) => boolean;
}

const Context = createContext<StateProps | undefined>(undefined);

export const ActionsProvider = ({ children }: { children?: ReactNode }) => {
    const [actionsMap, setActionsMap] = useState<Map<string, Action>>(new Map());

    // Memoize children to prevent unnecessary re-renders
    const memoizedChildren = useMemo(() => children, [children]);

    // Memoize actions array to prevent recalculations
    const actions = useMemo(() => Array.from(actionsMap.entries()), [actionsMap]);

    // Optimize addAction with equality check
    const addAction = useCallback((id: string, action: Omit<Action, 'id'>) => {
        setActionsMap(prev => {
            // Check if action already exists and is identical
            const existingAction = prev.get(id);
            if (existingAction &&
                existingAction.icon === action.icon &&
                existingAction.component === action.component &&
                existingAction.showAsPopover === action.showAsPopover &&
                existingAction.position === action.position &&
                existingAction.breakpoin === action.breakpoin &&
                JSON.stringify(existingAction.slotProps) === JSON.stringify(action.slotProps)) {
                return prev;
            }

            const map = new Map(prev);
            map.set(id, { id, ...action });
            return map;
        });
        return () => removeAction(id);
    }, []);

    // Optimize removeAction
    const removeAction = useCallback((id: string) => {
        setActionsMap(prev => {
            if (!prev.has(id)) return prev;
            const map = new Map(prev);
            map.delete(id);
            return map;
        });
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<StateProps>(() => ({
        actions,
        addAction,
        removeAction,
        hasAction: (id: string) => actionsMap.has(id)
    }), [actions, actionsMap, addAction, removeAction]);

    return (
        <Context.Provider value={contextValue}>
            {memoizedChildren}
        </Context.Provider>
    );
};

export const useActionsProvider = () => {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error('useActionsProvider must be used within an ActionsProvider');
    }
    return context;
};

export const useActionsByBreakpoint = (min: Breakpoint, max?: Breakpoint) => {
    const theme = useTheme();
    const actionsProvider = useActionsProvider();

    // Check if viewport matches the breakpoint range
    const minMatch = useMediaQuery(theme.breakpoints.up(min));
    const maxMatch = max ? useMediaQuery(theme.breakpoints.down(max)) : true;
    const matches = minMatch && maxMatch;

    // Memoize breakpoint keys to prevent recalculations
    const breakpointKeys = useMemo(() => theme.breakpoints.keys, [theme.breakpoints.keys]);

    // Filter and sort actions based on breakpoint
    const filteredActions = useMemo(() => {
        if (!matches || !actionsProvider) return [];

        return actionsProvider.actions.filter(([_, action]) => {
            if (!action.breakpoin) return true;

            const actionBreakpointIndex = breakpointKeys.indexOf(action.breakpoin);
            const minBreakpointIndex = breakpointKeys.indexOf(min);

            if (actionBreakpointIndex < minBreakpointIndex) return false;
            if (max) {
                const maxBreakpointIndex = breakpointKeys.indexOf(max);
                return actionBreakpointIndex <= maxBreakpointIndex;
            }
            return true;
        }).sort((a, b) => (a[1].position || 0) - (b[1].position || 0));
    }, [matches, actionsProvider, min, max, breakpointKeys]);

    // Clean up actions when breakpoint no longer matches
    useEffect(() => {
        if (!matches && actionsProvider && filteredActions.length > 0) {
            filteredActions.forEach(([id]) => {
                actionsProvider.removeAction(id);
            });
        }
    }, [matches, filteredActions, actionsProvider]);

    return filteredActions;
};