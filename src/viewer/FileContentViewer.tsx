'use client'

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useViewerForFile, useViewerManager, ViewerModule } from './ModuleViewerManager';
import { useSearchParams } from 'next/navigation';
import { Stack, Paper, Alert, Button } from '@mui/material';
import { useFileViewerLayout } from './FileViewerLayout';
import { useFilePreflight } from '@/hooks/useFilePreflight';
import { ErrorState } from './ErrorState';
import { NoViewerState } from './NoViewerState';
import { LoadingState } from './LoadingState';
import { ViewerContent } from './ViewerContent';

export default function FileContentViewer() {

    const { getViewerById, getSupportedViewers } = useViewerManager();
    const searchParams = useSearchParams();
    const fileLayout = useFileViewerLayout();

    // Get the stable "with" parameter value
    const viewerParam = useMemo(() => searchParams.get("with"), [searchParams]);

    const fileId = useMemo(() => fileLayout.firstId, [fileLayout?.firstId]);
    const fileSubpath = useMemo(() => fileLayout.listId.slice(1), [fileLayout?.listId]);
    const preflightProps = useMemo(() => ({ fileId, subsId: fileSubpath }), [fileId, fileSubpath]);
    const { success, error, loading, file } = useFilePreflight(preflightProps);


    const [viewerPending, setViewerPending] = useState(true);
    const defaultViewerModule = useViewerForFile(file);
    const supportedViewers = file ? getSupportedViewers(file) : [];
    const [viewerModule, setViewerModule] = useState<ViewerModule | null>(null);

    const handleRefresh = useCallback(() => {
        window.location.reload();
    }, []);

    const handleViewerChange = useCallback((module: ViewerModule) => {
        setViewerModule(module);
        const url = new URL(window.location.href);
        url.searchParams.set('with', module.id);
        window.history.replaceState({}, '', url.toString());
        setViewerPending(true);
        setTimeout(() => setViewerPending(false), 50);
    }, []);

    // Handle viewer module selection
    useEffect(() => {
        // Only set pending if the viewer is actually changing
        const currentViewerId = viewerModule?.id;
        const newViewerId = viewerParam || defaultViewerModule?.id;

        if (currentViewerId !== newViewerId) {
            setViewerPending(true);

            if (viewerParam) {
                const module = getViewerById(viewerParam);
                setViewerModule(module);
            } else if (defaultViewerModule) {
                setViewerModule(defaultViewerModule);
            }

            setTimeout(() => {
                setViewerPending(false);
            }, 100);
        }
    }, [viewerParam, getViewerById, defaultViewerModule, viewerModule?.id]);

    useEffect(() => {
        fileLayout.setFile(file || null);
    }, [file, fileLayout]);

    const fileContentProps = useMemo(() => ({
        viewerModule,
        file,
        supportedViewers,
        onViewerChange: handleViewerChange,
        onRefresh: handleRefresh
    }), [viewerModule, file, supportedViewers, handleViewerChange, handleRefresh]);

    return (
        <Paper component={Stack} sx={{ flex: 1, overflow: 'hidden', mb: 1 }}>

            {((loading || viewerPending) && !error) ? (
                <LoadingState />
            ) : (error || !success) ? (
                <ErrorState
                    error={error || undefined}
                    onRefresh={handleRefresh}
                    file={file} />
            ) : !viewerModule ? (
                <NoViewerState
                    file={file}
                    supportedViewers={supportedViewers}
                    onViewerChange={handleViewerChange}
                />
            ) : (
                <ViewerContent {...fileContentProps as any} />
            )}
        </Paper>
    );
}