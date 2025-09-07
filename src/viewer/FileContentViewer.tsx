import { File } from '@/entity/File';
import { useEffect, useMemo, useState } from 'react';
import { useViewerForFile, useViewerManager, ViewerModule } from './ModuleViewerManager';
import { useSearchParams } from 'next/navigation';
import { Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import { useFileViewerLayout } from './FileViewerLayout';
import { useFilePreflight } from '@/hooks/useFilePreflight';

export interface FileContentViewerProps {
    file?: File;
}
export default function FileContentViewer({ file: initialFile }: FileContentViewerProps) {

    const { getViewerById, getSupportedViewers } = useViewerManager();
    const searchParams = useSearchParams();


    const fileLayout = useFileViewerLayout();
    const fileId = useMemo(() => fileLayout.firstId, [fileLayout?.firstId]);
    const fileSubpath = useMemo(() => fileLayout.listId.slice(1), [fileLayout?.listId]);

    const { success, error, loading, file } = useFilePreflight(fileId, fileSubpath);
    // const [file, setFile] = useState<File>();

    const defaultViewerModule = useViewerForFile(file);
    const supportedViewers = file ? getSupportedViewers(file) : [];
    const [viewerModule, setViewerModule] = useState<ViewerModule | null>(null);



    // Handle viewer module selection
    useEffect(() => {
        const moduleId = searchParams.get("with");
        if (moduleId) {
            const module = getViewerById(moduleId);
            setViewerModule(module);
        } else if (defaultViewerModule) {
            setViewerModule(defaultViewerModule);
        }
    }, [searchParams, getViewerById, defaultViewerModule]);


    useEffect(() => {
        fileLayout.setFile(file || null);
    }, [file]);


    const renderContent = () => {

        if (!viewerModule) {
            return (
                <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
                    <AlertCircle size={48} color="#ff9800" />
                    <Typography variant="h6">No Viewer Available</Typography>
                    <Typography color="text.secondary" textAlign="center">
                        No suitable viewer found for this file type.
                    </Typography>
                    <Button variant="contained">
                        Download File
                    </Button>
                </Stack>
            );
        }

        const ViewerComponent = viewerModule.component;

        return (
            <Stack flex={1} sx={{ width: '100%', height: '100%', minHeight: 500, justifyContent: "center", alignItems: "center" }}>
                <ViewerComponent file={file} />
            </Stack>
        );
    };


    if (loading) {
        return (
            <Stack flex={1} justifyContent="center" alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                    Loading file information...
                </Typography>
            </Stack>
        );
    }


    return (
        <Paper
            component={Stack}
            sx={{
                flex: 1,
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: 2,
                bgcolor: 'background.paper',
            }}>
            {renderContent()}
        </Paper>
    );
}