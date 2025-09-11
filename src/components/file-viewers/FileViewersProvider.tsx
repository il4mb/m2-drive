import User from '@/entities/User';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
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
            setViewers(prev => {
                const updated: Viewers = [];
                data.forEach(newViewer => {
                    const existing = prev.find(v => v.uid === newViewer.uid);
                    if (existing) {
                        updated.push({
                            ...existing,
                            ...newViewer
                        });
                    } else {
                        updated.push(newViewer);
                    }
                });

                // Detect and remove viewers not in `data`
                const currentUids = new Set(data.map(v => v.uid));
                return updated.filter(v => currentUids.has(v.uid));
            });

            // Keep existUsersId for Firestore sync
            setExistUsersId(
                data.filter(u => !u.isGuest && u.uid).map(u => u.uid) as string[]
            );
        };

        socket.on("viewers-change", onViewersChange);
        socket.emit("viewer-join", path);

        return () => {
            socket.off("viewers-change", onViewersChange);
            socket.emit("viewer-leave", path);
        };
    }, [path]);


    useEffect(() => {
        if (!existUsersId.length) return;
        const query = getMany("user").where("id", "IN", existUsersId);
        const unsubscribe = onSnapshot(query, (data) => {
            setViewers(prev =>
                prev.map(roomUser => {
                    if (!roomUser.uid) return roomUser;

                    const matchedUser = data.rows.find(u => u.id === roomUser.uid);
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

export const useFileViewers = () => useContext(Context);



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
