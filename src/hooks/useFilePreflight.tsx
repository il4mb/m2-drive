'use client';
import { File } from '@/entity/File';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { useState, useEffect } from 'react';

// File preflight hook with improved error handling

export const useFilePreflight = (fileId: string, subsId?: string[]) => {
    const [success, setSuccess] = useState<boolean>(false);
    const [error, setError] = useState<null | string>(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File>();

    const sendPreflight = () => {
        invokeFunction("filePreflight", { fileId, subsId })
            .then(response => {
                console.log(response)
                setSuccess(response.success);
                setError(response.error || null);
                setFile(response.data);
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
        setLoading(true);
        sendPreflight();
    }, [fileId, subsId]);

    return { success, error, loading, file };
};
