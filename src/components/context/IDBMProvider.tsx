'use client'


import { IDBM } from "@/libs/idxdb/IDBM";
import { DriveUpload } from "@/types";
import { createContext, ReactNode, useContext, useMemo } from "react";

type Schema = {
    uploads: DriveUpload;
};
const idbm = new IDBM<Schema>('MerapiPanel', 4);
const createIDBM = () => idbm.init({
    uploads: {
        autoIncrement: false,
        key: ['id'],
        index: {
            byId: ['id']
        }
    }
});

type IDBMX = ReturnType<typeof createIDBM>

const IDBContext = createContext<IDBMX>({} as any);
export function useIDBM<K extends keyof IDBMX>(k: K) {
    return useContext(IDBContext)[k];
}


export interface IIdbProviderProps {
    children: ReactNode;
}

export default function IDBMProvider({ children }: IIdbProviderProps) {

    const idb = useMemo(() => createIDBM(), []);
    return (
        <IDBContext.Provider value={idb}>
            {children}
        </IDBContext.Provider>
    );
}

export const useUploadsIdb = () => useIDBM("uploads");
