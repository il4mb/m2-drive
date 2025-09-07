'use client'

import { Box, CircularProgress, Stack, Typography, Paper, Button, IconButton } from '@mui/material';
import { AlertOctagon, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useFilePreflight } from '@/hooks/useFilePreflight';
import { formatFileSize } from '@/libs/utils';
import FileContentViewer from '@/viewer/FileContentViewer';
import { useMemo } from 'react';
import RoomProvider from '@/components/rooms/RoomProvider';
import WhoViewer from '@/components/file-viewers/WhoViewer';
import { motion } from 'motion/react';


export default function FileViewPage() {

    // const router = useRouter();
    // const { filesId } = useParams<{ filesId: string[] }>();
    // const firstId = useMemo(() => filesId?.[0], [filesId]);
    // const subsId = useMemo(() => filesId?.slice(1), [filesId]);

    // const { success, error, loading, file } = useFilePreflight(firstId, subsId);


    // const handleBack = () => {
    //     router.back();
    // };

    // if (loading) {
    //     return (
    //         <Stack flex={1} justifyContent="center" alignItems="center" spacing={2}>
    //             <CircularProgress />
    //             <Typography variant="body2" color="text.secondary">
    //                 Loading file information...
    //             </Typography>
    //         </Stack>
    //     );
    // }

    // if (!success || error || !file) {
    //     return (
    //         <Stack flex={1} justifyContent="center" alignItems="center" spacing={2} p={3}>
    //             <AlertOctagon size={48} color="#f44336" />
    //             <Typography variant="h6" color="error">
    //                 Failed to load file
    //             </Typography>
    //             <Typography variant="body2" color="text.secondary" textAlign="center">
    //                 {error || "We couldn't load the file information. Please try again."}
    //             </Typography>
    //             <Button
    //                 variant="outlined"
    //                 onClick={handleBack}
    //                 startIcon={<ArrowLeft size={16} />}
    //                 sx={{ mt: 2 }}>
    //                 Go Back
    //             </Button>
    //         </Stack>
    //     );
    // }


    return (
        <FileContentViewer />
    )

    return (
        // <RoomProvider roomId={firstId} key={firstId}>
        <Stack component={motion.div} layout layoutId='header' height="100vh" overflow="hidden">
            {/* Header */}
            <Paper
                square
                elevation={1}
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 0
                }}>
                <IconButton onClick={handleBack}>
                    <ArrowLeft size={20} />
                </IconButton>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap title={file.name}>
                        {file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {file.type === 'folder' ? 'Folder' : 'File'}
                        {file.type === 'file' && (file.meta as any)?.size && ` • ${formatFileSize((file.meta as any).size)}`}
                    </Typography>
                </Box>

                <WhoViewer />

                {/* {file.type === 'file' && (
                    <Button
                        variant="contained"
                        startIcon={<Download size={16} />}
                        onClick={() => window.open(`/file/${fileId}`, '_blank')}>
                        Download
                    </Button>
                )} */}
            </Paper>

            {/* Content Area */}
            <FileContentViewer file={file} />
        </Stack>
        // </RoomProvider>
    );
}