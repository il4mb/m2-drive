'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUploadsIdb } from './IDBMProvider';
import { DriveUpload } from '@/types';
import { randomBytes } from 'crypto';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { CloudUpload } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import UploadManager from './UploadManager';

interface UploadProviderState {
    uploads: DriveUpload[];
    addUpload: (file: File, fId: string | null) => void;
    hideBadge: () => void;
}

const UploadProviderContext = createContext<UploadProviderState | undefined>(undefined);

type UploadProviderProps = {
    children?: ReactNode;
};

export const UploadsProvider = ({ children }: UploadProviderProps) => {

    const pathname = usePathname();
    const db = useUploadsIdb();
    const [showBadge, setShowBadge] = useState(true);
    const [uploads, setUploads] = useState<DriveUpload[]>([]);

    const CHUNK_SIZE = 5 * 1024 * 1024;

    const addUpload = (file: File, fId: string | null) => {

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const id = randomBytes(8).toString("hex");

        const chunks: Blob[] = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            chunks.push(chunk);
        }

        const upload: DriveUpload = {
            id,
            uid: '1',
            status: "pending",
            fId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            chunkIndex: 0,
            totalChunks,
            chunks
        }

        db.add(upload);

    }


    useEffect(() => {
        const getAll = () => {
            db.getAll().then(setUploads).catch(() => setUploads([]));
        }
        const unsubscribe = db.on("any", getAll);
        getAll();

        return () => {
            unsubscribe();
        }
    }, [db]);


    useEffect(() => {
        setShowBadge(uploads.length > 0);
    }, [pathname]);


    return (
        <UploadProviderContext.Provider value={{
            uploads,
            addUpload,
            hideBadge: () => setShowBadge(false)
        }}>
            <UploadManager>
                {children}
            </UploadManager>

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
                            m: 4
                        }}>
                        <Tooltip title="Lihat unggahan" arrow>
                            <IconButton LinkComponent={Link} href='/drive/upload'
                                sx={{
                                    position: 'relative',
                                    width: 45,
                                    height: 45,
                                    borderRadius: 5
                                }}
                                color='primary'>
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
