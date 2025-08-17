import { DriveFile } from "@/entity/DriveFile";
import useCache from "./useCache";
import { useEffect } from "react";
import useRequest from "./useRequest";

export default function usePresignUrl(file: DriveFile) {

    const [cache, setCache, locked] = useCache(file.id);
    const request = useRequest({
        endpoint: "/api/drive/presign-url",
        queryParams: { id: file.id },
        onSuccess(result) {
            setCache({
                value: result.data.url,
                exp: result.data.exp
            })
        },
    });

    useEffect(() => {

        if (file.type != "file" || locked) return;
        if (cache && cache.exp <= Date.now()) {
            request.send()
        } else if (!cache) {
            request.send()
        }
    }, [locked, cache]);

    return cache?.value || undefined;
}