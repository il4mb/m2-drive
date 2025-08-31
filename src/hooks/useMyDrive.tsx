import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import { File } from "@/entity/File";
import { getMany, getOne } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { useEffect, useState } from "react";

export const useMyDrive = (pId: string | null) => {

    const { user } = useCurrentSession();
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        if (!user?.id) return;

        const query = getMany("file")
            .where('uId', "==", user.id)
            .where('pId', '==', pId || "@IsNull")

        const unsubscriber = onSnapshot(query, (data) => {
            console.log("CHANGE")
            setFiles(data);
        });

        return () => {
            unsubscriber();
        }
    }, [user]);

    return files;
}