'use client'

import { Breakpoint, PopoverProps, useMediaQuery, useTheme } from '@mui/material';
import { isEqual } from 'lodash';
import { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect, FC, FunctionComponent, useRef } from 'react';

export interface Action<T = Record<string, any>> {
    id: string;
    icon?: ReactNode;
    componentProps?: T;
    component: ReactNode | FunctionComponent<T>;
    showAsPopover?: boolean;
    position?: number;
    breakpoin?: Breakpoint;
    slotProps?: {
        popover?: PopoverProps
    }
}

interface StateProps {
    actions: [string, Action][];
    addAction: (id: string, action: Omit<Action, 'id'>) => (() => void);
    removeAction: (id: string) => void;
    hasAction: (id: string) => boolean;
    updateAction: (id: string, props: Partial<Omit<Action, 'id'>>) => void;
    updateActionProps: (id: string, props: Record<string, any>) => void
}

const Context = createContext<StateProps | undefined>(undefined);

export const ActionsProvider = ({ children }: { children?: ReactNode }) => {
    const [actionsMap, setActionsMap] = useState<Map<string, Action>>(new Map());
    
    // Use refs to track previous values and prevent infinite updates
    const actionsMapRef = useRef(actionsMap);
    const updateCountRef = useRef(0);

    // Memoize children to prevent unnecessary re-renders
    const memoizedChildren = useMemo(() => children, [children]);

    // Memoize actions array to prevent recalculations
    const actions = useMemo(() => Array.from(actionsMap.entries()), [actionsMap]);

    // Optimize addAction with equality check
    const addAction = useCallback((id: string, action: Omit<Action, 'id'>) => {
        setActionsMap(prev => {
            // Check if the action already exists with the same data
            const existingAction = prev.get(id);
            const newAction = { id, ...action };
            
            if (existingAction && isEqual(existingAction, newAction)) {
                return prev; // No change needed
            }
            
            const map = new Map(prev);
            map.set(id, newAction);
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

    const updateActionProps = useCallback(<T extends Record<string, any>>(id: string, props: Partial<T>) => {
        setActionsMap(prev => {
            if (!prev.has(id)) return prev;
            
            const map = new Map(prev);
            const action = map.get(id)!;
            
            // Deep compare to avoid unnecessary updates
            const newComponentProps = { ...action.componentProps, ...props };
            if (isEqual(action.componentProps, newComponentProps)) {
                return prev;
            }
            
            map.set(id, { ...action, componentProps: newComponentProps });
            return map;
        });
    }, []);

    const updateAction = useCallback(
        (id: string, data: Partial<Omit<Action, 'id'>>) => {
            setActionsMap(prev => {
                const existing = prev.get(id);
                if (!existing) return prev;
                
                // Create updated action
                const updated = { ...existing, ...data };
                
                // Deep equality check - if nothing changed, return the same Map
                if (isEqual(existing, updated)) {
                    return prev;
                }
                
                const map = new Map(prev);
                map.set(id, updated);
                return map;
            });
        },
        []
    );

    // Track updates and prevent infinite loops
    useEffect(() => {
        if (actionsMapRef.current !== actionsMap) {
            actionsMapRef.current = actionsMap;
            updateCountRef.current++;
            
            // Safety check - if we're updating too frequently, log a warning
            if (updateCountRef.current > 100) {
                console.warn('ActionsProvider: Potential infinite update detected');
            }
        }
    }, [actionsMap]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<StateProps>(() => ({
        actions,
        updateActionProps,
        updateAction,
        addAction,
        removeAction,
        hasAction: (id: string) => actionsMap.has(id)
    }), [actions, actionsMap, addAction, removeAction, updateAction, updateActionProps]);

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
    
    // Use refs to track previous values and prevent unnecessary updates
    const previousActionsRef = useRef<[string, Action][]>([]);
    const previousMatchesRef = useRef<boolean>(false);

    // Check if viewport matches the breakpoint range
    const minMatch = useMediaQuery(theme.breakpoints.up(min));
    const maxMatch = max ? useMediaQuery(theme.breakpoints.down(max)) : true;
    const matches = minMatch && maxMatch;

    // Memoize breakpoint keys to prevent recalculations
    const breakpointKeys = useMemo(() => theme.breakpoints.keys, [theme.breakpoints.keys]);

    // Filter and sort actions based on breakpoint
    const filteredActions = useMemo(() => {
        if (!matches || !actionsProvider) return [];

        const newFilteredActions = actionsProvider.actions
            .filter(([_, action]) => {
                if (!action.breakpoin) return true;

                const actionBreakpointIndex = breakpointKeys.indexOf(action.breakpoin);
                const minBreakpointIndex = breakpointKeys.indexOf(min);

                if (actionBreakpointIndex < minBreakpointIndex) return false;
                if (max) {
                    const maxBreakpointIndex = breakpointKeys.indexOf(max);
                    return actionBreakpointIndex <= maxBreakpointIndex;
                }
                return true;
            })
            .sort((a, b) => (a[1].position || 0) - (b[1].position || 0));

        // Check if the filtered actions have actually changed
        if (isEqual(previousActionsRef.current, newFilteredActions)) {
            return previousActionsRef.current;
        }

        previousActionsRef.current = newFilteredActions;
        return newFilteredActions;
    }, [matches, actionsProvider, min, max, breakpointKeys, actionsProvider?.actions]);

    // Clean up actions when breakpoint no longer matches
    useEffect(() => {
        // Only clean up if we previously matched and now don't
        if (previousMatchesRef.current && !matches && actionsProvider && filteredActions.length > 0) {
            filteredActions.forEach(([id]) => {
                actionsProvider.removeAction(id);
            });
        }
        
        previousMatchesRef.current = matches;
    }, [matches, filteredActions, actionsProvider]);

    return filteredActions;
};