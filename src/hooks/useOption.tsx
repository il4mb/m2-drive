import CloseSnackbar from "@/components/ui/CloseSnackbar";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { getOne } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState, useCallback } from "react";

export function useOption<T = string>(id: string, initialValue: T): [T, (value: T) => Promise<void>] {

    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            getOne("options").where("id", "==", id),
            (data) => {
                if (data == null) {
                    setValue(initialValue);
                } else {
                    const raw = data.value as string;

                    if (typeof initialValue === "boolean") {
                        // @ts-ignore
                        setValue(raw === "true");
                    } else if (typeof initialValue === "number") {
                        const num = parseFloat(raw);
                        // @ts-ignore
                        setValue(isNaN(num) ? initialValue : num);
                    } else {
                        // @ts-ignore
                        setValue(raw);
                    }
                }
            }
        );
        return unsubscribe;
    }, [id, initialValue]);

    const handleSaveValue = useCallback(
        async (newValue: T) => {
            const stringValue = String(newValue);
            const result = await invokeFunction("saveOption", { id, value: stringValue });
            if (!result.success) {
                enqueueSnackbar(result.error || "Unknown Error", {
                    variant: "error",
                    action: CloseSnackbar,
                });
            }
        },
        [id]
    );

    return [value, handleSaveValue];
};
