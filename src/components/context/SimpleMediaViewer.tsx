'use client'

import { File } from '@/entity/File';
import { Stack, IconButton, Typography, Box } from '@mui/material';
import { createContext, useContext, useState, ReactNode } from 'react';
import usePresignUrl from '../hooks/usePresignUrl';
import { X } from 'lucide-react';

type SimpleMediaViewerState = (file: File) => void;

const SimpleMediaViewerContext = createContext<SimpleMediaViewerState | undefined>(undefined);

type SimpleMediaViewerProps = {
    children?: ReactNode;
};

export const SimpleMediaViewerProvider = ({ children }: SimpleMediaViewerProps) => {
    const [file, setFile] = useState<File>();
    const open = Boolean(file);
    const url = usePresignUrl(file); // use presigned url

    const openFile = (file: File) => {
        setFile(file);
    };

    const handleClose = () => {
        setFile(undefined);
    };

    const renderContent = () => {
        if (!file) return null;
        const mime = file.meta?.mimeType ?? "";

        if (mime.startsWith("image/")) {
            return <Box component="img" src={url ?? ''} alt={file.name} sx={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 2 }} />;
        }
        if (mime.startsWith("video/")) {
            return <Box component="video" src={url ?? ''} controls sx={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 2 }} />;
        }
        if (mime.startsWith("audio/")) {
            return <Box component="audio" src={url ?? ''} controls sx={{ width: '80%' }} />;
        }

        // fallback for unsupported file type
        return (
            <Stack alignItems="center" spacing={2}>
                <Typography variant="h6" color="white">
                    File type not supported
                </Typography>
                <Typography variant="body2" color="white" sx={{ opacity: 0.7 }}>
                    {file.name} ({mime || "unknown"})
                </Typography>
            </Stack>
        );
    };

    return (
        <SimpleMediaViewerContext.Provider value={openFile}>
            {children}
            {open && (
                <Stack
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        bgcolor: 'rgba(0,0,0,0.85)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1500,
                    }}>
                    <IconButton
                        onClick={handleClose}
                        sx={{ position: 'absolute', top: 16, right: 16, color: '#fff' }}>
                        <X />
                    </IconButton>
                    {renderContent()}
                </Stack>
            )}
        </SimpleMediaViewerContext.Provider>
    );
};

export const useSimpleMediaViewer = () => {
    const context = useContext(SimpleMediaViewerContext);
    if (!context) throw new Error('useSimpleMediaViewer must be used within a SimpleMediaViewerProvider');
    return context;
};
