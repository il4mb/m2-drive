'use client'

import { useEffect, useState, useCallback } from "react";
import Contributor from "@/entities/Contributor";
import { getMany } from "@/libs/websocket/query";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";

export const useContributors = (fileId: string) => {
    const [loading, setLoading] = useState(false);
    const [contributors, setContributors] = useState<Contributor[]>([]);

    const addContributor = useCallback(async (userId: string, role: "viewer" | "editor") => {
        if (loading) return;

        // ✅ prevent if contributor already exists with same role
        const exists = contributors.some(
            c => c.userId === userId && c.fileId === fileId && c.role === role
        );
        if (exists) return;

        setLoading(true);
        await invokeFunction("addFileContributor", { fileId, userId, role });
        // if(result.data) {
        //     setContributors(prev=> ([...prev, result.data].filter(e => e != null)));
        // }
        setLoading(false);
    }, [loading, contributors, fileId]);

    const updateContributor = useCallback(async (contributorId: string, role: "viewer" | "editor") => {
        if (loading) return;

        // ✅ prevent if role is unchanged
        const exists = contributors.find(c => c.id === contributorId);
        if (!exists || exists.role === role) return;

        setLoading(true);
        await invokeFunction("updateFileContributor", { contributorId, role });
        setLoading(false);
    }, [loading, contributors]);

    const removeContributor = useCallback(async (contributorId: string) => {
        if (loading) return;

        // ✅ prevent if already removed from state
        const exists = contributors.some(c => c.id === contributorId);
        if (!exists) return;

        setLoading(true);
        await invokeFunction("removeFileContributor", { id: contributorId });
        setLoading(false);
    }, [loading, contributors]);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(
            getMany("contributor")
                .relations(["user"])
                .where("fileId", "==", fileId),
            (data) => {
                setContributors(data);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, [fileId]);

    return { contributors, loading, addContributor, updateContributor, removeContributor };
};
