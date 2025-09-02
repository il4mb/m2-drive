'use client'
import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import { File } from "@/entity/File";
import { getMany, Json } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { useEffect, useState } from "react";

export const useMyTrash = () => {

    const { user } = useCurrentSession();
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        const query = getMany("file")
            .where("uId", "==", user.id)
            .where(Json("meta", "trashed"), "==", true);

        const unsubscribe = onSnapshot(query, (data) => {
            // @ts-ignore
            setFiles(data.filter(e => e.meta?.trashed));
            setLoading(false);
        })

        return unsubscribe;
    }, [user]);

    return { files, loading };
}

