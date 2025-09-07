'use client'

import Container from '@/components/Container';
import { useViewerManager, ViewerModule, useViewerForFile } from '@/viewer/ModuleViewerManager';
import MobileAction from '@/components/navigation/MobileAction';
import StickyHeader from '@/components/navigation/StickyHeader';
import { File } from '@/entity/File';
import usePresignUrl from '@/hooks/usePresignUrl';
import { formatFileSize } from '@/libs/utils';
import { getOne } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { Box, Button, Chip, IconButton, Paper, Skeleton, Stack, Typography, Menu, Alert, CircularProgress, MenuItem } from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { ChevronLeft, Download, MoreVertical, ExternalLink, AlertCircle } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useState, useCallback } from 'react';


export default function FileViewerPage() {
    const router = useRouter();
    const { getViewerById, getSupportedViewers } = useViewerManager();
    const { fileId } = useParams();
    const searchParams = useSearchParams();

    const [file, setFile] = useState<File<'file'> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewerModule, setViewerModule] = useState<ViewerModule | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const source = usePresignUrl(file?.meta?.Key);
    const defaultViewerModule = useViewerForFile(file);
    const supportedViewers = file ? getSupportedViewers(file) : [];

    const open = Boolean(anchorEl);

    // Handle file loading
    useEffect(() => {
        setLoading(true);
        setError(null);

        try {
            const unsubscribe = onSnapshot(
                getOne("file")
                    .where("id", "==", fileId),
                (data) => {
                    setFile(data as File<'file'>);
                    setLoading(false);
                },
                {
                    onError(error) {
                        setError('Failed to load file: ' + error.message);
                        setLoading(false);
                    },
                }
            );

            return unsubscribe;
        } catch (err) {
            setError('Failed to load file');
            setLoading(false);
        }
    }, [fileId]);

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

    const handleDownload = useCallback(() => {
        if (!source) return;

        const link = document.createElement('a');
        link.href = source;
        link.download = file?.name || 'file';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [source, file]);

    const handleOpenInBrowser = useCallback(() => {
        if (source) {
            window.open(source, '_blank');
        }
    }, [source]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleViewerChange = (viewerId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('with', viewerId);
        router.replace(`?${params.toString()}`, { scroll: false });
        handleMenuClose();
    };

    const getOpenWithOptions = () => {
        return (supportedViewers || []).map((viewer) => (
            <MenuItem
                key={viewer.id}
                onClick={() => handleViewerChange(viewer.id)}
                selected={viewerModule?.id === viewer.id}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    {typeof viewer.icon === 'string' ? (
                        <Typography>{viewer.icon}</Typography>
                    ) : (
                        viewer.icon
                    )}
                    <Typography variant="body2">{viewer.name}</Typography>
                </Stack>
            </MenuItem>
        ));
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
                    <CircularProgress />
                    <Typography color="text.secondary">Loading file...</Typography>
                </Stack>
            );
        }

        if (error) {
            return (
                <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
                    <AlertCircle size={48} color="#f44336" />
                    <Typography variant="h6" color="error">Error</Typography>
                    <Typography color="text.secondary" textAlign="center">
                        {error}
                    </Typography>
                    <Button variant="outlined" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </Stack>
            );
        }

        if (!file) {
            return (
                <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
                    <AlertCircle size={48} color="#ff9800" />
                    <Typography variant="h6">File Not Found</Typography>
                    <Typography color="text.secondary">
                        The requested file could not be found.
                    </Typography>
                    <Button variant="outlined" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </Stack>
            );
        }

        if (!viewerModule) {
            return (
                <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
                    <AlertCircle size={48} color="#ff9800" />
                    <Typography variant="h6">No Viewer Available</Typography>
                    <Typography color="text.secondary" textAlign="center">
                        No suitable viewer found for this file type.
                    </Typography>
                    <Button variant="contained" onClick={handleDownload}>
                        Download File
                    </Button>
                </Stack>
            );
        }

        const ViewerComponent = viewerModule.component;

        return (
            <Stack flex={1} sx={{ width: '100%', height: '100%', minHeight: 500, justifyContent: "center", alignItems: "center" }}>
                <ViewerComponent file={file} source={source} />
            </Stack>
        );
    };

    return (
        <>
            <StickyHeader>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', py: 1 }}>
                    {/* Back Button */}
                    <IconButton onClick={() => router.back()}>
                        <ChevronLeft size={20} />
                    </IconButton>

                    {/* File Info */}
                    {file ? (
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                bgcolor: 'action.hover'
                            }}>
                                <FileIcon
                                    size={24}
                                    variant="solid"
                                    type={file.meta?.mimeType || 'empty'}
                                />
                            </Box>

                            <Stack sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="subtitle1" noWrap>
                                    {file.name}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                        label={file.meta?.mimeType || 'Unknown type'}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(file.meta?.size || 0)}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Stack>
                                <Skeleton variant="text" width={200} height={24} />
                                <Skeleton variant="text" width={150} height={16} />
                            </Stack>
                        </Stack>
                    )}

                    {/* Actions */}
                    <MobileAction id='action'>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                startIcon={<Download size={16} />}
                                onClick={handleDownload}
                                disabled={!source}>
                                Download
                            </Button>

                            <IconButton
                                onClick={handleMenuOpen}
                                sx={{ border: 1, borderColor: 'divider' }}
                                disabled={supportedViewers.length === 0}>
                                <MoreVertical size={16} />
                            </IconButton>

                            <Menu
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleMenuClose}
                                PaperProps={{ sx: { minWidth: 200, maxHeight: 300 } }}>
                                <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                                    Open With
                                </Typography>
                                {getOpenWithOptions()}
                                <MenuItem onClick={handleOpenInBrowser}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <ExternalLink size={16} />
                                        <Typography variant="body2">Open in Browser</Typography>
                                    </Stack>
                                </MenuItem>
                            </Menu>
                        </Stack>
                    </MobileAction>
                </Stack>
            </StickyHeader>

            {/* Content Area */}
            <Paper
                component={Stack}
                sx={{
                    flex: 1,
                    overflow: 'hidden',
                    borderRadius: 2,
                    boxShadow: 2,
                    // maxHeight: 'min(900px, 85dvh)',
                    bgcolor: 'background.paper',
                }}>
                {renderContent()}
            </Paper>
        </>
    );
}