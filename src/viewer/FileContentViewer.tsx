'use client'

import { useMemo } from 'react';
import { Stack, Paper } from '@mui/material';
import { useFileViewerLayout } from './FileViewerLayout';
import { useFilePreflight } from '@/hooks/useFilePreflight';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import FileContentState from './FileContentState';

export default function FileContentViewer() {

    const fileLayout = useFileViewerLayout();
    const fileId = useMemo(() => fileLayout.firstId, [fileLayout?.firstId]);
    const fileSubpath = useMemo(() => fileLayout.listId.slice(1), [fileLayout?.listId]);
    const preflightProps = useMemo(() => ({ fileId, subsId: fileSubpath }), [fileId, fileSubpath]);
    const result = useFilePreflight(preflightProps);

    const handleRefresh = () => {
        result.refresh();
    }

    return (
        <Paper component={Stack} sx={{ flex: 1, overflow: 'hidden', mb: 1 }}>

            {result.file ? (
                <FileContentState file={result.file} onRefresh={handleRefresh}/>
            ) : result.error ? (
                <ErrorState
                    error={result.error || undefined}
                    onRefresh={handleRefresh}
                    file={result.file} />
            ) : (
                <LoadingState />
            )}
        </Paper>
    );
}