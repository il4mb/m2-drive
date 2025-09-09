'use client'

import { File } from "@/entities/File";
import { getMany, Json } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { useEffect, useState } from "react";

export const useDriveTrash = (userId?: string) => {

    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        const query = getMany("file")
            .where("uId", "==", userId)
            .where(Json("meta", "trashed"), "==", true);

        const unsubscribe = onSnapshot(query, (data) => {
            // @ts-ignore
            setFiles(data.filter(e => e.meta?.trashed));
            setLoading(false);
        })

        return unsubscribe;
    }, [userId]);

    return { files, loading };
}

