'use client'

import { getFileContributors } from "@/actions/contributors";
import useRequest from "./useRequest";
import { useState } from "react";
import Contributor from "@/entity/Contributor";
import { useOnEmit } from "@/socket";

export const useFileContributors = (fileId: string) => {

    const [contributors, setContributors] = useState<Contributor[]>([]);
    const request = useRequest({
        autoSend: true,
        action: getFileContributors,
        params: { fileId },
        validator(data) {
            return Boolean(data.fileId);
        },
        onSuccess(result) {
            setContributors(result.data || []);
        },
    }, [fileId]);

    useOnEmit("update", {
        collection: 'contributor',
        columns: {
            fileId
        },
        callback() {
            request.send();
        },
    });

    return { contributors, loading: request.pending }
}