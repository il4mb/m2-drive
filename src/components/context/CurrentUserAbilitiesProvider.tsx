'use client'

import User from '@/entities/User';
import { PERMISSION_LIST, PERMISSION_NAMES, TPermission } from '@/permission';
import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import Role from '@/entities/Role';
import useMyRole from '@/hooks/useMyRole';

interface CurrentUserAbilityProviderState {
    permissions: TPermission[];
    role?: Role;
}

const CurrentUserAbilityProviderContext = createContext<CurrentUserAbilityProviderState | undefined>(undefined);

type CurrentUserAbilityProviderProps = {
    children?: ReactNode;
    user?: User;
}
export const CurrentUserAbilitiesProvider = ({ children, user }: CurrentUserAbilityProviderProps) => {

    const myRole = useMyRole();
    const role = useMemo(() => myRole || undefined, [myRole]);
    const [permissions, setPermissions] = useState<TPermission[]>([]);

    useEffect(() => {
        setPermissions(PERMISSION_LIST.filter(e => (role?.abilities || []).includes(e.value)));
    }, [role]);
    
    return (
        <CurrentUserAbilityProviderContext.Provider value={{ permissions, role }}>
            {children}
        </CurrentUserAbilityProviderContext.Provider>
    );
};

export const useMyAbilities = () => {
    const context = useContext(CurrentUserAbilityProviderContext);
    if (!context) throw new Error('useCurrentUserAbilityProvider must be used within a CurrentUserAbilitiesProvider');
    return context;
};

export const useCheckMyPermissionState = (): ((n: PERMISSION_NAMES) => boolean) => {
    const context = useContext(CurrentUserAbilityProviderContext);
    if (!context) throw new Error('useCurrentUserAbilityProvider must be used within a CurrentUserAbilitiesProvider');

    const permissions = context.permissions;

    const checkPermission = useCallback((name: PERMISSION_NAMES) => {
        return permissions.some(e => e.value == name);
    }, [permissions]);

    return checkPermission;
}
