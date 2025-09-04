'use client'

import Token from '@/entity/Token';
import User from '@/entity/User';
import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import useRequest from '@/hooks/useRequest';
import { getCurrentSession } from '@/actions/current-session';
import { CurrentUserAbilitiesProvider } from './CurrentUserAbilitiesProvider';
import useUser from '@/hooks/useUser';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

interface CurrentSessionProviderState {
    tokenId?: string;
    createdAt?: number;
    expiredAt?: number;
    user?: User | null;
    refreshToken: () => void;
}

const CurrentSessionProviderContext = createContext<CurrentSessionProviderState | undefined>(undefined);

type CurrentSessionProviderProps = {
    children?: ReactNode;

}
export const CurrentSessionProvider = ({ children }: CurrentSessionProviderProps) => {

    const [token, setToken] = useState<Token>();
    const [userId, setUserId] = useState<string | null>(null);
    const { user } = useUser(userId);
    const router = useRouter();

    const request = useRequest({
        action: getCurrentSession,
        onSuccess(result) {
            setToken(result.data?.token);
            setUserId(result.data?.userId || null);
        },
        onError(error) {
            enqueueSnackbar(error.message, { variant: "error" })
            router.push('/auth');
        },
    }, [router]);
    
    const refreshToken = () => request.send();

    const stateValue = useMemo(() => ({
        ...token,
        user,
        refreshToken
    }), [token, user, refreshToken]);

    useEffect(() => {
        refreshToken();
    }, []);



    return (
        <CurrentSessionProviderContext.Provider value={stateValue}>
            <CurrentUserAbilitiesProvider user={user || undefined}>
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