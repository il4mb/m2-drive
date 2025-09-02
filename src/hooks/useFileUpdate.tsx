import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { updateFile, UpdateFilePart } from "@/server/functions/fileUpdate";
import { useState } from "react";


export const useFileUpdate = (fileId: string) => {

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const update = async (data: UpdateFilePart): Promise<boolean> => {
        setLoading(true);
        setError(null);
        return new Promise((resolve) => {
            invokeFunction(updateFile, {
                id: fileId,
                data
            }).then(e => {
                if (e.success) resolve(true);
                else {
                    resolve(false);
                    setError(e.error || 'Unknown Error');
                }
            }).finally(() => {
                setLoading(false)
            })
        })
    }

    return { update, loading, error };
}