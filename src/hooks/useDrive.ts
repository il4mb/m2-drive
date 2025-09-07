'use client'

import { File } from "@/entity/File";
import { useEffect, useState } from "react";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { getMany, getOne, IsNull, Json } from "@/libs/websocket/query";

export type Filter = {
    sortBy?: string;
    order?: "ASC" | "DESC";
    onlyType?: "file" | "folder";
};

export type UseDriveProps = {
    uId?: string | null;
    pId?: string | null;
    filter?: Filter;
    keyword?: string;
};

export default function useUserDrive({
    uId,
    pId,
    filter,
    keyword
}: UseDriveProps) {

    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<File[]>();
    const [parent, setParent] = useState<File | null>(null);

    useEffect(() => {

         if (!uId) return;
        setLoading(true);

        let timeoutId: NodeJS.Timeout | null = null;
        let unsubscribers: (() => void)[] = [];

        timeoutId = setTimeout(() => {
            const query = getMany("file")
                .where("uId", "==", uId)
                .where("pId", "==", pId || IsNull)
                .bracketWhere(q => {
                    q.orWhere(Json("meta", "trashed"), "==", IsNull)
                        .orWhere(Json("meta", "trashed"), "==", false);
                });

            if (keyword) {
                query.where("name", "STARTS WITH", keyword);
            }

            if (filter?.onlyType) {
                query.where("type", "==", filter.onlyType);
            }
            if (filter?.sortBy) {
                query.orderBy(
                    (filter.sortBy || "name") as any,
                    (filter.order || "ASC").toUpperCase() as any
                );
            }

            unsubscribers = [
                onSnapshot(
                    getOne("file").where("uId", "==", uId).where("id", "==", pId),
                    (data: any) => {
                        setParent(data || null);
                        setLoading(false);
                    }
                ),
                onSnapshot(query, (data) => {
                    // @ts-ignore
                    setFiles(data.filter(e => !e.meta?.trashed));
                    setLoading(false);
                })
            ];
        }, 300);

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            unsubscribers.forEach(unsub => unsub());
        };
    }, [uId, filter, keyword, pId]);

    return { files, parent, loading };
}



// export function useUserDriveSummary(uId: string) {

//     const [summary, setSummary] = useState<UserDriveSummary & { mimeBreakdown: Record<string, number> } | undefined>();

//     const request = useRequest({
//         action: getUserDriveSummary,
//         params: { uId },
//         validator(data) {
//             return Boolean(data.uId);
//         },
//         onSuccess(result) {
//             setSummary(result.data);
//         },
//     }, [uId]);

//     useOnEmit("update", {
//         collection: 'file',
//         columns: { uId },
//         callback() {
//             request.send();
//         },
//     }, [uId]);

//     useEffect(() => {
//         request.send();
//     }, [uId]);

//     return { summary }
// }

// export function useUserDriveFile(uId: string | null, id: string | null) {

//     const [loading, setLoading] = useState(true);
//     const [file, setFile] = useState<File>();

//     const request = useRequest({
//         action: getUserFile,
//         params: { uId: uId || '', id },
//         validator(data) {
//             return Boolean(data.uId);
//         },
//         onSuccess(result) {
//             setFile(result.data?.file);
//         },
//         onComplete() {
//             setLoading(false);
//         },
//     }, [uId, id]);

//     useOnEmit("update", {
//         collection: 'file',
//         columns: { uId, id },
//         callback() {
//             if (!id) return setLoading(false);
//             setLoading(true);
//             request.send();
//         },
//     }, [uId, id]);

//     useEffect(() => {
//         if (!id) return setLoading(false);
//         setLoading(true);
//         request.send();
//     }, [uId]);

//     return { file, loading }
// }