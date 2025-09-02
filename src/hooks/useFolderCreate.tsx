import CloseSnackbar from "@/components/ui/CloseSnackbar";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { createFolder } from "@/server/functions/fileUpdate";
import { enqueueSnackbar } from "notistack";
import { useState } from "react"

export const useCreateFolder = (userId?: string) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const create = async (name: string, pId: string | null): Promise<boolean> => {
        if (!userId) {
            enqueueSnackbar("No user found to create a folder", { variant: 'error', action: CloseSnackbar });
            return false;
        }

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