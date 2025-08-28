"use client";

import { isEqual } from "lodash";
import { useEffect } from "react";
import { io } from "socket.io-client";

export const socket = io({
    autoConnect: true,
});

export type EventData<D> = {
    collection: string;
    columns: Record<string, string | number | undefined | null>;
    data: D;
};

export function emitSocket<D = any>(name: string, data: EventData<D>) {
    socket.emit(name, data);
}

export function onEmitted<D = any>(
    name: string,
    callback: (data: EventData<D>) => void
) {
    socket.on(name, callback);
    return () => socket.off(name, callback);
}

type OnEmitProps<D> = {
    collection: string;
    columns: Record<string, string | number | undefined | null>;
    callback: (data: D) => void;
};

export function useOnEmit<D = any>(
    name: string,
    props: OnEmitProps<D>,
    deps: any[] = []
) {
    useEffect(() => {
        const unsubscribe = onEmitted(name, (data) => {
            console.log(name, data)
            if (data.collection !== props.collection) return;

            // Pick only the keys we care about
            const incomingFiltered: Record<string, any> = {};
            for (const key in props.columns) {
                incomingFiltered[key] = data.columns[key];
            }

            // Compare required columns only
            if (!isEqual(incomingFiltered, props.columns)) return;

            props.callback(data.data);
        });

        return () => {
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
