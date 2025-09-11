'use client'

import { SocketResult } from '@/server/socketHandlers';
import { socket } from '@/socket';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SessionManagerState {
    userId: string | null;
}

const SessionManagerContext = createContext<SessionManagerState | undefined>(undefined);

type SessionManagerProps = {
    children?: ReactNode;
}
export const SessionManager = ({ children }: SessionManagerProps) => {

    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const onLogedIn = (result: SocketResult<{ userId: string }>) => {
            setUserId(result.data?.userId || null);
        }
        socket.emit("session-validate");
        socket.on('session-validate-result', onLogedIn);

        return () => {
            socket.off('session-validate-result', onLogedIn);
        }
    }, []);

    return (
        <SessionManagerContext.Provider value={{ userId }}>
            {children}
        </SessionManagerContext.Provider>
    );
};

export const useSessionManager = () => {
    const context = useContext(SessionManagerContext);
    if (!context) throw new Error('useSessionManager must be used within a SessionManagerProvider');
    return context;
}