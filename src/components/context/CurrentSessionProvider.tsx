'use client'

import Token from '@/entity/Token';
import User from '@/entity/User';
import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import useRequest from '@/hooks/useRequest';
import { getCurrentSession } from '@/actions/current-session';
import { CurrentUserAbilitiesProvider } from './CurrentUserAbilitiesProvider';
import useUser from '@/hooks/useUser';
import { enqueueSnackbar } from 'notistack';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionManager } from './SessionManager';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { getOne } from '@/libs/websocket/query';

interface CurrentSessionProviderState {
    tokenId?: string;
    createdAt?: number;
    expiredAt?: number;
    user?: User | null;
    userId?: string;
    refreshToken?: () => void;
}

const CurrentSessionProviderContext = createContext<CurrentSessionProviderState | undefined>(undefined);

type CurrentSessionProviderProps = {
    children?: ReactNode;

}
export const CurrentSessionProvider = ({ children }: CurrentSessionProviderProps) => {

    const [mounted, setMounted] = useState(false);
    const { userId } = useSessionManager();
    const [token, setToken] = useState<Token>();
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, [])

    useEffect(() => {
        if (!mounted) return;
        if (!userId) {
            setUser(null);
            router.push("/login");
            return;
        }
        const unsubscribe = onSnapshot(
            getOne("user").where("id", "==", userId),
            setUser
        )
        return () => {
            unsubscribe
        }
    }, [userId, mounted]);


    const refreshToken = () => {

    }

    const stateValue = useMemo(() => ({
        ...token,
        user,
        userId,
        refreshToken
    }), [token, user, userId, refreshToken]);

    return (
        <CurrentSessionProviderContext.Provider value={stateValue as any}>
            <CurrentUserAbilitiesProvider user={user || undefined}>
                {children}
            </CurrentUserAbilitiesProvider>
        </CurrentSessionProviderContext.Provider>
    );
};

export const useCurrentSession = () => useContext(CurrentSessionProviderContext) || {};