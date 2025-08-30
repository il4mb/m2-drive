'use client'

import { getUser } from "@/actions/user";
import useRequest from "./useRequest";
import { useEffect, useState } from "react";
import User from "@/entity/User";
import { useOnEmit } from "@/socket";

export default function useUser(uId: string) {

    const [user, setUser] = useState<User>();

    const request = useRequest({
        action: getUser,
        params: { uId },
        validator(data) {
            return Boolean(data.uId);
        },
        onSuccess(result) {
            setUser(result.data);
        },
    });

    useOnEmit("update", {
        collection: 'user',
        columns: { id: uId },
        callback() {
            request.send();
        },
    }, [uId]);

    useEffect(() => {
        request.send();
    }, [uId]);

    return { user }
}