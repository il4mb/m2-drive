'use client'

import { useEffect, useState } from "react";
import User from "@/entities/User";
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { getOne } from "@/libs/websocket/query";

export default function useUser(uId?: string|null) {

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User|null>();

    useEffect(() => {
        if (!uId) return;
        setLoading(true);
        const unsubscribe = onSnapshot(
            getOne("user").where("id", "==", uId),
            (data) => {
                setUser(data);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [uId]);

    return { user, loading }
}