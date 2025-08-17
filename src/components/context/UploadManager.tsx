'use client';

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { TaskQueue } from '@/libs/TaskQueue';
import { useUploadsIdb } from './IDBMProvider';
import { DriveUpload } from '@/types';
import { useUploads } from './UploadsProvider';

export const CHUNK_SIZE = 5 * 1024 * 1024;

type Props = {
    children: ReactNode;
};

type UploadManagerContext = {
    uploads: DriveUpload[];
    pauseUpload: (id: string) => Promise<void>;
    resumeUpload: (id: string) => Promise<void>;
    removeUpload: (id: string) => Promise<void>;
};

const UploadContext = createContext<UploadManagerContext | null>(null);

export default function UploadManager({ children }: Props) {

    const queue = useMemo(() => new TaskQueue(1), []);
    const db = useUploadsIdb();
    const { uploads } = useUploads();

    /** Update upload entry in DB */
    const updateUpload = useCallback((id: string, data: Partial<DriveUpload>) => db.update({ id }, data), [db]);

    /** Upload handler for each file */
    const uploadHandler = useCallback(
        async (_: any, id: string, signal: AbortSignal) => {
            return new Promise<void>(async (resolve, reject) => {
                const upload = await db.get({ id });
                if (!upload) return resolve();

                updateUpload(id, { status: "uploading" });

                const totalChunks = upload.totalChunks;

                try {
                    
                    for (let i = upload.chunkIndex; i < totalChunks; i++) {
                        // check abort before processing
                        if (signal.aborted) throw new DOMException("Aborted", "AbortError");

                        await new Promise<void>((acc, rej) => {
                            const timer = setTimeout(() => {
                                updateUpload(id, { chunkIndex: i + 1 });
                                acc();
                            }, 2000);

                            // cancel timer if aborted mid-chunk
                            signal.addEventListener(
                                "abort",
                                () => {
                                    clearTimeout(timer);
                                    rej(new DOMException("Aborted", "AbortError"));
                                },
                                { once: true }
                            );
                        });
                    }

                    // finishing phase
                    updateUpload(id, { status: "finishing", chunkIndex: upload.totalChunks });

                    await new Promise<void>((acc, rej) => {
                        const timer = setTimeout(() => {
                            updateUpload(id, { status: "done" });
                            acc();
                        }, 4000);

                        signal.addEventListener(
                            "abort",
                            () => {
                                clearTimeout(timer);
                                rej(new DOMException("Aborted", "AbortError"));
                            },
                            { once: true }
                        );
                    });

                    resolve();
                } catch (err) {
                    updateUpload(id, { status: signal.aborted ? "pause" : "error" });
                    reject(err);
                }
            });
        },
        [db, updateUpload]
    );


    /** Start next upload if available */
    const startUpload = useCallback(async () => {
        // finish orphaned "uploading" entries
        const stuck = uploads.filter((u) => u.status === 'uploading' && !queue.has(u.id));
        await Promise.all(
            stuck.map((u) => {
                if (u.chunkIndex === u.totalChunks) {
                    return updateUpload(u.id, { status: 'done' });
                }
            })
        )

        // pick next pending
        const next = uploads.find((u) => u.status === 'pending' && !queue.has(u.id));
        if (next) queue.add(next.id, null, uploadHandler);

    }, [uploads, queue, uploadHandler, updateUpload]);


    const pauseUpload = useCallback(async (id: string) => {
        queue.abort(id);
    }, [queue, db]);


    const resumeUpload = useCallback(async (id: string) => {
        const upload = await db.get({ id });
        if (!upload) return;
        queue.clear();
        queue.add(id, null, uploadHandler);
    }, [queue, db]);


    /** Remove upload entry */
    const removeUpload = useCallback(async (id: string) => {
        queue.abort(id);
        await db.delete({ id });
    }, [queue, db]);


    /** Validate unfinished uploads on init */
    useEffect(() => {
        startUpload();
    }, [uploads, db, startUpload]);


    useEffect(() => {

        const fixBack = async (statutes: DriveUpload['status'][]) => {
            await Promise.all(
                statutes.map(async (status) => {
                    const uploads = await db.getAll("status", "==", status);
                    uploads.forEach(u => {
                        updateUpload(u.id, { status: 'pending' });
                    })
                })
            )
        }
        fixBack(['finishing', 'uploading']);

    }, [db, startUpload]);

    return (
        <UploadContext.Provider value={{ uploads, removeUpload, pauseUpload, resumeUpload }}>
            {children}
        </UploadContext.Provider>
    );
}

/** Hook to access UploadManager */
export const useUploadManager = () => {
    const ctx = useContext(UploadContext);
    if (!ctx) {
        throw new Error('useUploadManager must be used within DriveUploadManager');
    }
    return ctx;
};
