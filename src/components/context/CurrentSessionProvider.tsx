'use client'

import Token from '@/entity/Token';
import User from '@/entity/User';
import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import useRequest from '../hooks/useRequest';
import { getCurrentSession } from '@/actions/current-session';
import { CurrentUserAbilitiesProvider } from './CurrentUserAbilitiesProvider';
import { emitSocket, socket, useOnEmit } from '@/socket';

interface CurrentSessionProviderState {
    tokenId?: string;
    createdAt?: number;
    expiredAt?: number;
    user?: Omit<User, "password">;
    refreshToken: () => void;
}

const CurrentSessionProviderContext = createContext<CurrentSessionProviderState | undefined>(undefined);

type CurrentSessionProviderProps = {
    children?: ReactNode;

}
export const CurrentSessionProvider = ({ children }: CurrentSessionProviderProps) => {

    const [token, setToken] = useState<Token>();
    const [user, setUser] = useState<User>();

    const request = useRequest({
        action: getCurrentSession,
        onSuccess(result) {
            setToken(result.data?.token);
            setUser(result.data?.user as User);
        },
    });
    const refreshToken = () => request.send();

    const stateValue = useMemo(() => ({
        ...token,
        user,
        refreshToken
    }), [token, user, refreshToken]);

    useOnEmit("update", {
        collection: "user",
        columns: { id: user?.id },
        callback(data) {
            setUser(data);
        },
    }, [user]);

    useEffect(() => {
        refreshToken();
    }, []);

    return (
        <CurrentSessionProviderContext.Provider value={stateValue}>
            <CurrentUserAbilitiesProvider user={user}>
                {children}
            </CurrentUserAbilitiesProvider>
        </CurrentSessionProviderContext.Provider>
    );
};

export const useCurrentSession = () => {
    const context = useContext(CurrentSessionProviderContext);
    if (!context) throw new Error('useCurrentSessionProvider must be used within a CurrentSessionProvider');
    return context;
};