import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { UserDriveSummary } from "@/server/functions/summary";
import { useEffect, useState } from "react"

export const useDriveUssageSummary = (userId?: string) => {

    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<UserDriveSummary>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timmer = setTimeout(() => {
            setMounted(true);
        }, 100);
        return () => {
            setMounted(false);
            clearTimeout(timmer);
        }
    }, [userId]);

    useEffect(() => {
        if (!mounted) return;

        if (!userId) {
            setError("Missing user Id!");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        invokeFunction("getUserUssageSummary", { userId })
            .then((result) => {
                setLoading(false);
                if (!result.success) {
                    setError(result.error || "Unknown Error");
                    return;
                }
                setData(result.data);
            })
    }, [mounted, userId]);


    return { loading, data, error }
}