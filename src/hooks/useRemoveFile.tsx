import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { removeFile } from "@/server/functions/userDrive";
import { useState } from "react"

export const useRemoveFile = (userId?: string) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);


    const remove = async (fileId: string, permanen: boolean) => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        invokeFunction(removeFile, {
            fileId,
            userId,
            permanen
        }).then(e => {
            if (!e.success) {
                setError(e.error || 'Unknown Error')
            }
        }).finally(() => {
            setLoading(false)
        })
    }

    return { remove, loading, error };
}