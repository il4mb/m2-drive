import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { UserUpdatePart } from "@/server/functions/users"
import { useState } from "react"

export const useUserUpdate = (userId: string) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = async (data: UserUpdatePart) => {
        if (loading) return;
        setLoading(true);
        setError(null);
        const result = await invokeFunction("updateUser", { userId, data });
        if (!result.success) {
            setError(result.error || "Unknown Error");
        }
        setLoading(false);

        return true;
    }

    return { update, loading, error, clearError: () => setError(null) }
}