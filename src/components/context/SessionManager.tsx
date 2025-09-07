'use client'

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

        const onLogedIn = (userId: string | null) => {
            setUserId(userId);
        }
        socket.emit("session-validate");
        socket.on('session-change', onLogedIn);

        return () => {
            socket.off('session-change', onLogedIn);
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