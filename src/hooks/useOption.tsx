import { getOne } from "@/libs/websocket/query"
import { onSnapshot } from "@/libs/websocket/snapshot"
import { useEffect, useState } from "react"

export const useOption = (id: string) => {

    const [value, setValue] = useState<string>();

    useEffect(() => {
        const unsubscribe = onSnapshot(
            getOne("options").where("id", "==", id),
            (data) => {
                setValue(data?.value || undefined);
            }
        );
        return unsubscribe;
    }, [id]);


    return value;
}