'use client'

import { useEffect, useState } from "react";
import Contributor from "@/entity/Contributor";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { getMany } from "@/libs/websocket/query";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { addFileContributor, removeFileContributor, updateFileContributor } from "@/server/functions/contributors";

export const useContributors = (fileId: string) => {

    const [loading, setLoading] = useState(false);
    const [contributors, setContributors] = useState<Contributor[]>([]);

    const addContributor = async (userId: string, role: "viewer" | "editor") => {
        if (loading) return;
        setLoading(true);
        await invokeFunction(addFileContributor, { fileId, userId, role });
        setLoading(false);
    }

    const updateContributor = async (contributorId: string, role: "viewer" | "editor") => {
        if (loading) return;
        setLoading(true);
        await invokeFunction(updateFileContributor, { contributorId, role });
        setLoading(false);
    }

    const removeContributor = async (contributorId: string) => {
        if (loading) return;
        setLoading(true);
        await invokeFunction(removeFileContributor, { id: contributorId });
        setLoading(false)
    }

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(
            getMany("contributor")
                .relations(['user'])
                .where("fileId", "==", fileId),
            (data) => {
                setContributors(data);
                setLoading(false);
            })
        return unsubscribe;
    }, [fileId]);

    return { contributors, loading, addContributor, updateContributor, removeContributor }
}