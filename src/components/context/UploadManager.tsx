'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, } from 'react';
import { ClientTaskQueue } from '@/libs/clientTaskQueue';
import { useUploadsIdb } from './IDBMProvider';
import { FileUpload } from '@/types';
import { useUploads } from './UploadsProvider';
import useRequest from '@/hooks/useRequest';

export const CHUNK_SIZE = 5 * 1024 * 1024;

type Props = {
    children: ReactNode;
};

type UploadManagerContext = {
    uploads: FileUpload[];
    pauseUpload: (id: string) => Promise<void>;
    resumeUpload: (id: string) => Promise<void>;
    removeUpload: (id: string) => Promise<void>;
};

const UploadContext = createContext<UploadManagerContext | null>(null);

export default function UploadManager({ children }: Props) {

    const queue = useMemo(() => new ClientTaskQueue(1), []);
    const db = useUploadsIdb();
    const { uploads } = useUploads();

    const initRequest = useRequest<{ data: { Key: string; UploadId: string } }>({
        endpoint: "/api/drive/upload",
        method: "POST"
    });

    const presignRequest = useRequest<{ data: { url: string } }>({
        endpoint: "/api/drive/upload",
        method: "GET"
    });

    const completeRequest = useRequest({
        endpoint: "/api/drive/upload/complete",
        method: "POST"
    });


    /** Update upload entry in DB */
    const updateUpload = useCallback((id: string, data: Partial<FileUpload>) => db.update({ id }, data), [db]);

    /** Upload handler for each file */
    const uploadHandler = useCallback(
        async (_: any, id: string, signal: AbortSignal) => {
            return new Promise<void>(async (resolve, reject) => {
                const upload = await db.get({ id });
                if (!upload) return resolve();

                try {

                    const response = await initRequest.send({
                        body: {
                            fileType: upload.fileType,
                            Key: upload.Key,
                            UploadId: upload.UploadId
                        }
                    }, signal);
                    if (!response.data.Key || !response.data.UploadId) throw new Error("Failed init upload");

                    updateUpload(id, {
                        status: "uploading",
                        Key: response.data.Key,
                        UploadId: response.data.UploadId
                    });

                    upload.Key = response.data.Key;
                    upload.UploadId = response.data.UploadId;
                    const totalChunks = upload.totalChunks;
                    const chunks = upload.chunks;
                    const etags = upload.etags || [];

                    for (let i = upload.chunkIndex; i < totalChunks; i++) {
                        // check abort before processing
                        if (signal.aborted) throw new DOMException("Aborted", "AbortError");

                        const PartNumber = i + 1;
                        const presign = await presignRequest.send({
                            queryParams: {
                                Key: upload.Key,
                                UploadId: upload.UploadId,
                                PartNumber
                            }
                        }, signal);

                        if (!presign.data.url) throw new Error("Failed get presign url");


                        const chunk = chunks[i];

                        // do upload to presign-url
                        const uploadRes = await fetch(presign.data.url, { method: "PUT", body: chunk, signal });
                        if (!uploadRes.ok) throw new Error(`Chunk ${PartNumber} upload failed`);

                        // get etag
                        const etag = uploadRes.headers.get("ETag")?.replace(/"/g, "");
                        if (!etag) throw new Error(`ETag missing for chunk ${PartNumber}`);

                        etags.push({ ETag: etag, PartNumber });

                        // update progress
                        await updateUpload(id, { chunkIndex: PartNumber, etags });
                    }

                    // finishing phase
                    updateUpload(id, { status: "finishing", chunkIndex: upload.totalChunks });

                    await completeRequest.send({
                        body: {
                            fileName: upload.fileName,
                            fileType: upload.fileType,
                            fileSize: upload.fileSize,
                            fId: upload.fId,
                            Key: upload.Key,
                            UploadId: upload.UploadId,
                            etags
                        }
                    }, signal);

                    updateUpload(id, { status: "done" });
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


    // useEffect(() => {

    //     const fixBack = async (statutes: DriveUpload['status'][]) => {
    //         await Promise.all(
    //             statutes.map(async (status) => {
    //                 const uploads = await db.getAll("status", "==", status);
    //                 uploads.forEach(u => {
    //                     updateUpload(u.id, { status: 'pending' });
    //                 })
    //             })
    //         )
    //     }
    //     fixBack(['finishing', 'uploading']);

    // }, [db, startUpload]);

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
