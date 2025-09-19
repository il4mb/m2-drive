'use client'

import { File } from '@/entities/File';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFileViewerLayout } from './FileViewerLayout';
import { useViewerForFile, useViewerManager, ViewerModule } from './ModuleViewerManager';
import { useSearchParams } from 'next/navigation';
import { ViewerContent } from './ViewerContent';
import { NoViewerState } from './NoViewerState';
import { Stack, Typography } from '@mui/material';

export interface FileContentStateProps {
    file: File;
    onRefresh: () => void;
}
export default function FileContentState({ file, onRefresh }: FileContentStateProps) {

    const searchParams = useSearchParams();
    const viewerParam = useMemo(() => searchParams.get("with"), [searchParams]);
    const { getViewerById, getSupportedViewers } = useViewerManager();
    const fileLayout = useFileViewerLayout();
    const [viewerPending, setViewerPending] = useState(true);
    const defaultViewerModule = useViewerForFile(file);
    const supportedViewers = file ? getSupportedViewers(file) : [];
    const [viewerModule, setViewerModule] = useState<ViewerModule | null>(null);

    const handleRefresh = useCallback(() => {
        onRefresh();
    }, []);

    const handleViewerChange = useCallback((module: ViewerModule) => {
        setViewerModule(module);
        const url = new URL(window.location.href);
        url.searchParams.set('with', module.id);
        window.history.replaceState({}, '', url.toString());
        setViewerPending(true);
        setTimeout(() => setViewerPending(false), 50);
    }, []);

    const fileContentProps = useMemo(() => ({
        viewerModule,
        file,
        supportedViewers,
        onViewerChange: handleViewerChange,
        onRefresh: handleRefresh
    }), [viewerModule, file, supportedViewers, handleViewerChange, handleRefresh]);


    useEffect(() => {
        fileLayout.setFile(file || null);
    }, [file]);

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


    if (viewerPending) {
        return (
            <Stack alignItems={"center"} justifyContent={"center"} flex={1}>
                <Typography textAlign={"center"}>
                    Viewer sedang disiapkan...
                </Typography>
            </Stack>
        )
    }

    if (!viewerModule || !fileContentProps.viewerModule) {
        return (
            <NoViewerState
                file={file}
                supportedViewers={supportedViewers}
                onViewerChange={handleViewerChange}
            />
        )
    }


    return (
        <ViewerContent {...fileContentProps as any} />
    );
}