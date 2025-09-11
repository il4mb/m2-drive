import { useCurrentSession } from "@/components/context/CurrentSessionProvider"
import { File } from "@/entities/File";
import { getMany } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
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
            setFiles(data.rows);
        });

        return () => {
            unsubscriber();
        }
    }, [session]);

    return files;
}