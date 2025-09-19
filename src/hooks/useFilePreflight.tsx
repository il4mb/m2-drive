'use client';
import { File } from '@/entities/File';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { useState, useEffect } from 'react';

// File preflight hook with improved error handling

export const useFilePreflight = ({ fileId, subsId }: { fileId: string, subsId?: string[] }) => {
   
    const [success, setSuccess] = useState<boolean>(false);
    const [error, setError] = useState<null | string>(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File>();

    const sendPreflight = () => {
        setLoading(true);
        setFile(undefined);
        setError(null);

        invokeFunction("filePreflight", { fileId, subsId })
            .then(response => {
                if (!response.error) {
                    setSuccess(response.success);
                    setFile(response.data);
                } else {
                    // Only set error if not "Duplicate request ignored" 
                    // OR if file belum ada
                    if (
                        response.error !== "Duplicate request ignored" ||
                        !file
                    ) {
                        setError(response.error || null);
                    }
                }
            })
            .catch(err => {
                setError(err.message || 'Failed to load file information');
                setSuccess(false);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        sendPreflight();
    }, [fileId, subsId]);

    return { success, error, loading, file, refresh: sendPreflight };
};
