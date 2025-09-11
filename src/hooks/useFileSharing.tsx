import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import Contributor from "@/entities/Contributor";
import { getMany, IsNull, Json } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { useEffect, useMemo, useState } from "react";

export const useSharing = () => {
    const session = useCurrentSession();
    const [fromMe, setFromMe] = useState<Contributor[]>([]);
    const [toMe, setToMe] = useState<Contributor[]>([]);
    const [loading, setLoading] = useState({ fromMe: false, toMe: false });
    const fromMeQuery = useMemo(() =>
        getMany("file")
            .where("uId", "==", session?.user?.id), [session?.user?.id])

    useEffect(() => {
        if (!session?.user?.id) return;
        setLoading({ fromMe: true, toMe: true });


        const unsubscribers = [
            onSnapshot(
                getMany('contributor')
                    .relations(['file', 'user'])
                    .where('$file.uId', '==', session?.user.id)
                    .groupBy('$file.id')
                    .bracketWhere(e => {
                        e.where(Json("$file.meta", "trashed"), "==", IsNull)
                            .orWhere(Json("$file.meta", "trashed"), "==", false)
                    }),
                (data) => {
                    setLoading(prev => ({ ...prev, fromMe: false }));
                    setFromMe(data.rows.filter(e => !e.file.meta?.trashed));
                }),
            onSnapshot(
                getMany('contributor')
                    .relations(['file', 'user'])
                    .where('userId', '==', session?.user.id)
                    .bracketWhere(e => {
                        e.where(Json("$file.meta", "trashed"), "==", IsNull)
                            .orWhere(Json("$file.meta", "trashed"), "==", false)
                    }),
                (data) => {
                    setLoading(prev => ({ ...prev, toMe: false }));
                    setToMe(data.rows.filter(e => !e.file.meta?.trashed));
                })
        ];

        return () => {
            unsubscribers.map(e => e())
        }
    }, [fromMeQuery, session?.user]);



    return { fromMe, toMe, loading }
}