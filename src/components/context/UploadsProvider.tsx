'use client'

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useFileBlobIdb, useUploadsIdb } from './IDBMProvider';
import { FileUpload } from '@/types';
import { randomBytes } from 'crypto';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { CloudUpload } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { getColor } from '@/theme/colors';
import useImageResize from '@/hooks/useImageResize';
import { useCurrentSession } from './CurrentSessionProvider';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '../ui/CloseSnackbar';
import { ClientTaskQueue } from '@/libs/clientTaskQueue';

interface UploadProviderState {
    uploads: FileUpload[];
    addUpload: (file: File, fId: string | null) => void;
    updateUpload: (id: string, data: Partial<FileUpload>) => Promise<void>;
    hideBadge: () => void;
    retryUpload: (id: string) => Promise<void>;
    cancelUpload: (id: string) => Promise<void>;
    removeUpload: (id: string) => Promise<void>;
}

const UploadProviderContext = createContext<UploadProviderState | undefined>(undefined);

type InitialRequestProps = {
    Key?: string;
    UploadId?: string;
    fileType: string;
    fileName: string;
    fileSize: number;
}

type PresignRequestProps = {
    Key: string;
    UploadId: string;
    PartNumber: number;
}

type CompleteRequestProps = {
    fileName: string;
    fileType: string;
    fileSize: number;
    fId: string | null;
    Key: string;
    UploadId: string;
    etags: Array<{ ETag: string, PartNumber: number }>;
}

type UploadProviderProps = {
    children?: ReactNode;
};

export const UploadsProvider = ({ children }: UploadProviderProps) => {
    const queue = useMemo(() => new ClientTaskQueue(4), []);
    const { user } = useCurrentSession();
    const pathname = usePathname();
    const db = useUploadsIdb();
    const dbFileBlob = useFileBlobIdb();
    const resizeImage = useImageResize(250, 250);
    const [showBadge, setShowBadge] = useState(true);
    const [uploads, setUploads] = useState<FileUpload[]>([]);
    const CHUNK_SIZE = 5 * 1024 * 1024;

    const initialRequest = async (data: InitialRequestProps, signal: AbortSignal) => {
        const response = await fetch(
            "/api/uploads",
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal
            }
        );

        if (!response.ok) {
            throw new Error(`Initial request failed: ${response.status}`);
        }

        return response.json();
    }

    const presignRequest = async (data: PresignRequestProps, signal: AbortSignal) => {
        const query = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
            query.append(key, value.toString());
        });

        const response = await fetch(
            "/api/uploads?" + query.toString(),
            {
                method: "GET",
                signal
            }
        );

        if (!response.ok) {
            throw new Error(`Presign request failed: ${response.status}`);
        }

        return response.json();
    }

    const completeRequest = async (data: CompleteRequestProps, signal: AbortSignal) => {
        const response = await fetch(
            "/api/uploads/complete",
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal
            }
        );

        if (!response.ok) {
            throw new Error(`Complete request failed: ${response.status}`);
        }

        return response.json();
    }

    /** Upload handler for each file */
    const uploadHandler = useCallback(
        async (_: null, id: string, signal: AbortSignal) => {
            try {
                const upload = await db.get({ id });
                if (!upload) throw new Error("Upload not found!");
                const fileBlobs = await dbFileBlob.get({ fileId: upload.id })
                if (!fileBlobs) throw new Error("fileBlobs not found!");


                // Initial request to get upload ID and key
                const response = await initialRequest({
                    fileType: upload.fileType,
                    fileName: upload.fileName,
                    fileSize: upload.fileSize,
                    Key: upload.Key,
                    UploadId: upload.UploadId
                }, signal);

                if (!response.data?.Key || !response.data?.UploadId) {
                    throw new Error("Failed to initialize upload");
                }

                await updateUpload(id, {
                    status: "uploading",
                    Key: response.data.Key,
                    UploadId: response.data.UploadId,
                    // progress: 0
                });

                const totalChunks = upload.totalChunks;
                const chunks = fileBlobs.chunks;
                const etags: Array<{ ETag: string, PartNumber: number }> = upload.etags || [];

                for (let i = upload.chunkIndex; i < totalChunks; i++) {
                    // Check abort before processing
                    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

                    const PartNumber = i + 1;
                    const presign = await presignRequest({
                        Key: response.data.Key,
                        UploadId: response.data.UploadId,
                        PartNumber
                    }, signal);

                    if (!presign.data?.url) throw new Error("Failed to get presign URL");

                    // Do upload to presign-url
                    const uploadRes = await fetch(presign.data.url, {
                        method: "PUT",
                        body: chunks[i],
                        signal
                    });

                    if (!uploadRes.ok) throw new Error(`Chunk ${PartNumber} upload failed`);

                    // Get etag
                    const etag = uploadRes.headers.get("ETag")?.replace(/"/g, "");
                    if (!etag) throw new Error(`ETag missing for chunk ${PartNumber}`);

                    etags.push({ ETag: etag, PartNumber });

                    // Update progress
                    await updateUpload(id, {
                        chunkIndex: PartNumber,
                        etags,
                        progress: Math.round((PartNumber / totalChunks) * 100)
                    });
                }

                // Finishing phase
                await updateUpload(id, {
                    status: "finishing",
                    chunkIndex: upload.totalChunks
                });

                const completeResponse = await completeRequest({
                    fileName: upload.fileName,
                    fileType: upload.fileType,
                    fileSize: upload.fileSize,
                    fId: upload.fId,
                    Key: response.data.Key,
                    UploadId: response.data.UploadId,
                    etags
                }, signal);

                if (!completeResponse.status) {
                    throw new Error("Failed to complete upload");
                }

                await updateUpload(id, {
                    status: "done",
                    progress: 100
                });

            } catch (err: any) {
                if (signal.aborted) {
                    await updateUpload(id, { status: 'pause' });
                } else {
                    const errorMessage = err?.message || "Unknown error occurred";
                    await updateUpload(id, {
                        status: "error",
                        error: errorMessage
                    });
                }
            }
        },
        [db]
    );

    const addUpload = async (file: File, fId: string | null) => {
        if (!user) {
            enqueueSnackbar("Invalid session", { variant: "error", action: CloseSnackbar });
            return;
        }

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const id = randomBytes(8).toString("hex");

        const chunks: Blob[] = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            chunks.push(chunk);
        }

        const upload: FileUpload = {
            id,
            uId: user.id,
            status: "pending",
            fId,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            chunkIndex: 0,
            totalChunks,
            etags: [],
            progress: 0,
            // createdAt: new Date().toISOString()
        };

        const fileBlob = { fileId: id, chunks }

        if (file.type.startsWith("image/")) {
            try {
                const thumbnail = await resizeImage(file);
                if (thumbnail) {
                    upload.thumbnail = await thumbnail.arrayBuffer(); // URL.createObjectURL(thumbnail);
                }
            } catch (error) {
                console.error("Failed to create thumbnail:", error);
            }
        }
        await dbFileBlob.add(fileBlob);
        try {
            await db.add(upload);
            startUpload();
        } catch (err) {
            await dbFileBlob.delete({ fileId: id })
        }

    }

    const updateUpload = async (id: string, data: Partial<FileUpload>) => {
        await db.update({ id }, data);
        // Refresh the uploads list
        const allUploads = await db.getAll();
        setUploads(allUploads);
    }

    const startUpload = useCallback(async () => {
        const allUploads = await db.getAll();
        const pendingUploads = allUploads.filter((u) => u.status === 'pending');

        pendingUploads.forEach(upload => {
            if (!queue.has(upload.id)) {
                queue.add(upload.id, null, uploadHandler);
            }
        });


    }, [db, queue, uploadHandler]);

    const retryUpload = async (id: string) => {
        const upload = uploads.find(e => e.id === id);
        if (!upload) {
            enqueueSnackbar("Upload not found!", { variant: "warning", action: CloseSnackbar });
            return;
        }

        const initialStatus = upload.status;

        return new Promise<void>((resolve) => {
            let timer: ReturnType<typeof setInterval> | null = null;

            const checkStatus = async () => {
                const updated = await db.get({ id });
                if (updated?.status !== initialStatus) {
                    if (timer) clearInterval(timer);
                    resolve();
                }
            };

            // Poll every 100ms until status changes
            timer = setInterval(checkStatus, 100);

            // Start upload if not queued
            if (!queue.has(id)) {
                queue.add(id, null, uploadHandler);
            }

            void queue.startUntilRun(id).catch(err => {
                console.error("Upload queue error:", err);
                if (timer) clearInterval(timer);
                resolve(undefined);
            });
        });
    };


    const removeUpload = async (id: string) => {
        const upload = await db.get({ id });
        if (!upload) {
            enqueueSnackbar("Upload not found!", { variant: "warning", action: CloseSnackbar });
            return;
        }
        if (["finishing", "pending", "uploading"].includes(upload.status)) {
            // Cancel the upload first
            await cancelUpload(id);
        }
        await db.delete({ id });
    }

    const cancelUpload = async (id: string) => {
        queue.abort(id);
        await updateUpload(id, { status: "pause" });
        enqueueSnackbar("Upload paused", { variant: "info", action: CloseSnackbar });
    }

    const fixBack = async () => {
        const uploads = await db.getAll("status", "in", ["finishing", "pending", "uploading", "error"]);
        await Promise.all(
            uploads.map(async (u) => {
                await updateUpload(u.id, { status: 'pending' });
            })
        );
        startUpload();
    }

    useEffect(() => {
        const getAll = () => {
            db.getAll().then(setUploads).catch(() => setUploads([]));
        };

        const unsubscribe = db.on("any", getAll);
        getAll();
        fixBack();

        return () => {
            unsubscribe();
            queue.clear(); // Clean up all tasks on unmount
        };
    }, [db, queue]);

    useEffect(() => {
        setShowBadge(uploads.length > 0);
    }, [pathname, uploads]);

    return (
        <UploadProviderContext.Provider
            value={{
                uploads,
                addUpload,
                updateUpload,
                hideBadge: () => setShowBadge(false),
                retryUpload,
                cancelUpload,
                removeUpload
            }}>
            {children}

            <AnimatePresence mode='wait'>
                {showBadge && (
                    <Box
                        component={motion.div}
                        initial={{ x: 10, y: 10, opacity: 0 }}
                        animate={{ x: 0, y: 0, opacity: 1 }}
                        exit={{ x: 20, y: 20, opacity: 0, transition: { duration: 0 } }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 12,
                            mass: 1
                        }}
                        sx={{
                            position: 'fixed',
                            bottom: 0,
                            right: 0,
                            m: 4,
                            zIndex: 9999
                        }}>
                        <Tooltip title="View uploads" arrow>
                            <IconButton
                                LinkComponent={Link}
                                href='/drive/upload'
                                sx={{
                                    position: 'relative',
                                    width: 45,
                                    height: 45,
                                    borderRadius: 5,
                                    borderColor: 'none',
                                    background: getColor('primary')[400],
                                    color: getColor('primary')[100],
                                    "&:hover": {
                                        background: getColor('primary')[500]
                                    }
                                }}>
                                <CloudUpload />
                                <Chip
                                    color='primary'
                                    label={uploads.length}
                                    sx={{
                                        position: 'absolute',
                                        top: -10,
                                        right: -10
                                    }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </AnimatePresence>
        </UploadProviderContext.Provider>
    );
};

export const useUploads = () => {
    const context = useContext(UploadProviderContext);
    if (!context) throw new Error('useUploads must be used within an UploadsProvider');
    return context;
};