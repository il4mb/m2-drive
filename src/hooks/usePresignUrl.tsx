import useCache from "./useCache";
import { useEffect, useState } from "react";
import { invokeFunction } from "@/libs/websocket/invokeFunction";

export default function usePresignUrl(fileId?: string, metaKey = "Key", download = false) {

    const [cache, setCache, pending] = useCache(`${fileId}-${metaKey}-${download}`);
    const [mounted, setMounted] = useState(false);

    const handleGetPresign = async () => {
        if (!fileId) return;
        const result = await invokeFunction("getFileURLPresign", { fileId, metaKey });
        if (!result.success || !result.data) return;
        setCache({
            value: result.data!.url,
            exp: result.data!.exp
        });
    }

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        if (pending || !mounted) return;
        if (cache && cache.exp <= Date.now()) {
            handleGetPresign();
        } else if (!cache) {
            handleGetPresign();
        }
    }, [pending, mounted, cache]);

    return cache?.value || undefined;
}

type PresignUrlWithProps = {
    fileId: string;
    metaKey?: string;
    download?: boolean;
}
export const usePresignUrlWith = ({ fileId, metaKey = "Key", download = false }: PresignUrlWithProps) => {
    return usePresignUrl(fileId, metaKey, download);
}


export const getPresignUrl = async (objectKey: string, download = false, fileName = "download") => {
    return (
         await invokeFunction("getFileURLPresign", { objectKey, download, fileName })
    ).data?.url;
}

export const getPresignUrlWithKey = async (objectKey: string, metaKey: string) => {
    return (
        await fetch(`/api/presign-url/${objectKey.replace(/^\//, '')}`)
            .then(r => r.json())
    )?.data?.url;
}