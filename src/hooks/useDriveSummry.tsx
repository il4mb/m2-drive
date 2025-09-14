import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { UserDriveSummary } from "@/server/functions/summary";
import { useEffect, useState } from "react"

export const useDriveUssageSummary = (userId?: string) => {

    const [data, setData] = useState<UserDriveSummary>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        invokeFunction("getUserUssageSummary", { userId })
            .then(result => {
                setLoading(false);
                if (!result.success) {
                    setError(result.error || "Unknown Error");
                    return;
                }
                setData(result.data);
            })
    }, [userId]);


    return { loading, data, error }
}