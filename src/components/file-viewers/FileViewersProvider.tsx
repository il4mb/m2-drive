import User from '@/entity/User';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { Viewer } from '@/server/socketHandlers';
import { socket } from '@/socket';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type Viewers = (Viewer & { avatar?: string, isOnline?: boolean })[];
export interface FileViewersProps {
    children?: ReactNode;
    path: string | string[];
}
export default function FileViewersProvider({ children, path }: FileViewersProps) {

    const [existUsersId, setExistUsersId] = useState<string[]>([]);
    const [viewers, setViewers] = useState<Viewers>([]);

    useEffect(() => {
        const onViewersChange = (data: Viewer[]) => {
            const usersId = data
                .filter(u => !u.isGuest && u.uid)
                .map(u => u.uid);

            setExistUsersId(usersId as any);
            setViewers(data);
        }
        socket.on("viewers-change", onViewersChange);
        socket.emit("viewer-join", path);

        return () => {
            socket.off("viewers-change", onViewersChange);
            socket.emit("viewer-leave", path);
        }
    }, [path]);

    useEffect(() => {
        if (!existUsersId.length) return;
        const query = getMany("user").where("id", "IN", existUsersId);
        const unsubscribe = onSnapshot(query, (dbUsers: User[]) => {
            setViewers(prev =>
                prev.map(roomUser => {
                    if (!roomUser.uid) return roomUser;

                    const matchedUser = dbUsers.find(u => u.id === roomUser.uid);
                    return {
                        ...roomUser,
                        avatar: matchedUser?.meta.avatar,
                        displayName: matchedUser?.name || roomUser.displayName,
                        isOnline: matchedUser?.meta.isActive
                    };
                })
            );
        });

        return unsubscribe;
    }, [existUsersId]);

    return (
        <Context.Provider value={viewers}>
            {children}
        </Context.Provider>
    );
}


const Context = createContext<Viewers | undefined>(undefined);

export const useFileViewers = () => {
    const context = useContext(Context);
    return context;
}



export const useFileViewersByFile = (fileId: string) => {
    const allViewers = useFileViewers();
    const [viewers, setViewers] = useState<Viewers>([]);

    useEffect(() => {
        if (!allViewers) return;
        const filtered = allViewers.filter(v =>
            v.path?.some(p => {
                if (Array.isArray(p)) {
                    return p[p.length - 1] === fileId;
                }
                return p === fileId;
            })
        );
        setViewers(filtered);
    }, [allViewers, fileId]);

    return viewers;
};
