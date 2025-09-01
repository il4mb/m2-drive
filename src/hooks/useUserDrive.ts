'use client'

import { File, Folder } from "@/entity/File";
import { useEffect, useRef, useState } from "react";
import useRequest from "./useRequest";
import { getUserFile, getUserDriveSummary, UserDriveSummary } from "@/actions/dive-root";
import { useOnEmit } from "@/socket";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { getMany, getOne, IsNull, Json } from "@/libs/websocket/query";
import { validateByConditionsRecursive } from "@/server/database/helper";
import { QueryCondition } from "@/server/database/types";

type Filter = {
    sortBy?: "type" | "name" | "createdAt" | "updatedAt" | "trashedAt";
    order?: "asc" | "desc";
    onlyType?: "file" | "folder";
}



export default function useUserDrive(
    uId: string | null,
    pId?: string,
    filter: Filter = { sortBy: "type", order: "asc" }
) {
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<File[]>();
    const [parent, setParent] = useState<Folder | null>(null);
    const signature = useRef('');

    useEffect(() => {

        const propsString = JSON.stringify({ uId, pId, filter });
        if (!uId || propsString == signature.current) return;
        signature.current = propsString;

        setLoading(true);

        const query = getMany("file")
            .where("uId", "==", uId)
            .where("pId", "==", pId || IsNull)
            .bracketWhere(q => {
                q.orWhere(Json("meta", "trashed"), "==", IsNull)
                    .orWhere(Json("meta", "trashed"), "==", false)
            })

        if (filter.onlyType) {
            query.where("type", "==", filter.onlyType);
        }
        if (filter.sortBy) {
            query.orderBy(
                (filter.sortBy || "name") as any,
                (filter.order || "ASC").toUpperCase() as any
            );
        }

        const unsubscriber = [
            onSnapshot(getOne("file").where("uId", "==", uId).where("id", "==", pId), (data: any) => {
                setParent(data || null);
                setLoading(false);
            }),
            onSnapshot(query, (data) => {
                // @ts-ignore
                setFiles(data.filter(e=> !e.meta?.trashed));
                setLoading(false);
            })
        ]

        return () => {
            unsubscriber.map(e => e());
        };
    }, [uId, filter, pId]);

    return { files, parent, loading };
}



export function useUserDriveSummary(uId: string) {

    const [summary, setSummary] = useState<UserDriveSummary & { mimeBreakdown: Record<string, number> } | undefined>();

    const request = useRequest({
        action: getUserDriveSummary,
        params: { uId },
        validator(data) {
            return Boolean(data.uId);
        },
        onSuccess(result) {
            setSummary(result.data);
        },
    }, [uId]);

    useOnEmit("update", {
        collection: 'file',
        columns: { uId },
        callback() {
            request.send();
        },
    }, [uId]);

    useEffect(() => {
        request.send();
    }, [uId]);

    return { summary }
}

export function useUserDriveFile(uId: string | null, id: string | null) {

    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File>();

    const request = useRequest({
        action: getUserFile,
        params: { uId: uId || '', id },
        validator(data) {
            return Boolean(data.uId);
        },
        onSuccess(result) {
            setFile(result.data?.file);
        },
        onComplete() {
            setLoading(false);
        },
    }, [uId, id]);

    useOnEmit("update", {
        collection: 'file',
        columns: { uId, id },
        callback() {
            if (!id) return setLoading(false);
            setLoading(true);
            request.send();
        },
    }, [uId, id]);

    useEffect(() => {
        if (!id) return setLoading(false);
        setLoading(true);
        request.send();
    }, [uId]);

    return { file, loading }
}