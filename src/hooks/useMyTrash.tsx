import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import { File } from "@/entity/File";
import { getMany, getOne, IsNull, Json } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { useEffect, useState } from "react";

export const useMyTrash = () => {

    const { user } = useCurrentSession();
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        if (!user?.id) return;

        const query = getMany("file")
            // .where('uId', "==", user.id)
            .where('pId', '==', IsNull)
             .where(Json("meta", "trashed"), "==", true)

        const unsubscriber = onSnapshot(query, (data) => {
            setFiles(data);
        });

        return () => {
            unsubscriber();
        }
    }, [user]);

    return files;
}