'use client'

import User from '@/entity/User';
import { PERMISSION_LIST, PERMISSION_NAMES, TPermission } from '@/permission';
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import useRequest from '@/hooks/useRequest';
import { getCurrentUserAbilities } from '@/actions/current-session';
import Role from '@/entity/Role';

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

    const [permissions, setPermissions] = useState<TPermission[]>([]);
    const [role, setRole] = useState<Role>();
    const request = useRequest({
        action: getCurrentUserAbilities,
        onSuccess(result) {
            setPermissions(result.data?.permissions || []);
            setRole(result.data?.role);
        },
    });


    useEffect(() => {
        request.send();
    }, [user?.meta.role]);


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

export const useCheckMyPermission = (): ((n: PERMISSION_NAMES) => boolean) => {
    const context = useContext(CurrentUserAbilityProviderContext);
    if (!context) throw new Error('useCurrentUserAbilityProvider must be used within a CurrentUserAbilitiesProvider');

    const permissions = context.permissions;

    const checkPermission = useCallback((name: PERMISSION_NAMES) => {
        return permissions.some(e => e.value == name);
    }, [permissions]);

    return checkPermission;
}