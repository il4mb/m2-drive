import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import { File } from "@/entities/File";
import { getMany, getOne } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { useEffect, useState } from "react";

export const useMyDrive = (pId: string | null) => {

    const session = useCurrentSession();
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        if (!session?.user?.id) return;

        const query = getMany("file")
            .where('uId', "==", session?.user.id)
            .where('pId', '==', pId || "@IsNull")

        const unsubscriber = onSnapshot(query, (data) => {
            console.log("CHANGE")
            setFiles(data);
        });

        return () => {
            unsubscriber();
        }
    }, [session]);

    return files;
}