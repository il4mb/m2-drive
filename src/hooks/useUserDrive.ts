'use client'

import { File, Folder } from "@/entity/File";
import { useEffect, useState } from "react";
import useRequest from "./useRequest";
import { getUserFile, getUserFiles, getUserDriveSummary, UserDriveSummary } from "@/actions/dive-root";
import { useOnEmit } from "@/socket";

type Filter = {
    sortBy?: "type" | "name" | "createdAt" | "updatedAt" | "trashedAt";
    order?: "asc" | "desc";
    onlyType?: "file"|"folder";
}

export default function useUserDrive(uId: string | null, pId?: string, filter: Filter = { sortBy: "type", order: "asc" }) {

    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<File[]>();
    const [parent, setParent] = useState<Folder | null>(null);

    const request = useRequest({
        autoSend: true,
        action: getUserFiles,
        params: {
            uId: uId || '',
            pId,
            ...filter
        },
        validator(data) {
            return Boolean(data.uId);
        },
        onSuccess(result) {
            setFiles(result.data?.files || []);
            setParent(result.data?.parent || null);
        },
        onComplete() {
            setLoading(false);
        },
    }, [uId, pId, filter]);

    useOnEmit("update", {
        collection: 'file',
        columns: {
            uId,
            // pId: pId ? pId : null
        },
        callback() {
            setLoading(true);
            request.send();
        },
    }, [uId, pId]);

    return { files, parent, loading }
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