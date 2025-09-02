import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { createFolder } from "@/server/functions/fileUpdate";
import { useState } from "react"

export const useCreateFolder = (userId?: string) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const create = async (name: string, pId: string | null): Promise<boolean> => {
        if (!userId) return false;

        setLoading(true);
        setError(null);

        return new Promise((resolve) => {
            invokeFunction(createFolder, { pId, name, userId })
                .then(e => {
                    if (!e.success) {
                        setError(e.error || 'Unknown Error');
                        resolve(false);
                    }
                    resolve(true);
                }).finally(() => {
                    setLoading(false)
                })
        })
    }

    return { create, loading, error };
}