import useCache from "./useCache";
import { useEffect } from "react";
import useRequest from "./useRequest";

export default function usePresignUrl(objKey?: string) {

    const [cache, setCache, pending] = useCache(objKey);
    const request = useRequest({
        endpoint: `/api/presign-url/${objKey}`,
        onSuccess(result) {
            setCache({
                value: result.data.url,
                exp: result.data.exp
            })
        },
    });

    useEffect(() => {
        if (pending) return;
        if (cache && cache.exp <= Date.now()) {
            request.send()
        } else if (!cache) {
            request.send()
        }
    }, [pending, cache]);

    return cache?.value || undefined;
}


export const getPresignUrl = async (objectKey: string) => {
    return (
        await fetch(`/api/presign-url/${objectKey.replace(/^\//, '')}`)
            .then(r => r.json())
    )?.data?.url;
}