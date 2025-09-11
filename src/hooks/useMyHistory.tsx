import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import { File } from "@/entities/File";
import { getMany, IsNull, Json } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { useEffect, useState } from "react";

export const useMyHistory = () => {

    const session = useCurrentSession();
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        setLoading(false);
        const query = getMany("file")
            .where("uId", "==", session?.user?.id)
            .bracketWhere((q) => {
                q.where(Json('meta', 'trashed'), '==', IsNull)
                    .where(Json('meta', 'trashed'), '==', false)
            })
            .orderBy("createdAt", "DESC")
            .limit(10)

        const unsubscribe = onSnapshot(query, (data) => {
            setFiles(data.rows);
        });
        return unsubscribe;
    }, [session?.user]);

    return { loading, files }

}