'use client'

import User from '@/entities/User';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { Room, RoomUser } from '@/server/socketHandlers';
import { socket } from '@/socket';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';


type ContextState<T extends Record<string, any> = Record<string, any>> = {
    data: Room<T>;
    updateMyData: (data: T) => void;
}

export interface RoomProviderProps {
    children?: ReactNode;
    roomId: string;
}
export default function RoomProvider<T extends Record<string, any>>({ children, roomId }: RoomProviderProps) {

    const [data, setData] = useState<Room<T>>({} as any);

    const updateMyData = (data: Record<string, any>) => {
        socket.emit("room-update", roomId, data);
    }

    const state = useMemo<ContextState>(() => ({
        data, updateMyData
    }), [data, updateMyData]);


    useEffect(() => {
        if (!roomId) return;
        setData({} as any);
        const onRoomChanged = (data: any) => {
            delete data.id;
            setData(data);
        }

        socket.on("room-change", onRoomChanged);
        socket.emit("room-join", roomId);
        return () => {
            socket.off("room-change", onRoomChanged);
            socket.emit("room-leave", roomId);
        }
    }, [roomId]);



    return (
        <Context.Provider value={state}>
            {children}
        </Context.Provider>
    );
}


const Context = createContext<ContextState | undefined>(undefined);
export function useRoom<T extends Record<string, any>>() {
    const context = useContext(Context);
    if (!context) throw new Error("useRoom must call in RoomProvider");
    return context as unknown as ContextState<T>;
}


export function useRoomUsers<T = Record<string, any>>() {

    const context = useContext(Context);
    const [existUsersId, setExistUsersId] = useState<string[]>([]);
    const [users, setUsers] = useState<(RoomUser<T> & { id: string; user?: User })[]>([]);

    useEffect(() => {
        const roomUsers = Object.entries(context?.data.users || {}).map(([id, data]) => ({
            id,
            ...(data as RoomUser<T>),
        }));

        const usersId = roomUsers
            .filter(u => !u.isGuest && u.userId)
            .map(u => u.userId);

        setExistUsersId(usersId as any);
        setUsers(roomUsers);
    }, [context?.data]);

    useEffect(() => {
        if (!existUsersId.length) return;

        const query = getMany("user").where("id", "IN", existUsersId);

        const unsubscribe = onSnapshot(query, (dbUsers: User[]) => {
            setUsers(prev =>
                prev.map(roomUser => {
                    if (!roomUser.userId) return roomUser;

                    const matchedUser = dbUsers.find(u => u.id === roomUser.userId);
                    return { ...roomUser, user: matchedUser || roomUser.user };
                })
            );
        });

        return unsubscribe;
    }, [existUsersId]);

    return users;
}
