'use client'

import { useEffect, useMemo, useState } from 'react';
import { useViewerForFile, useViewerManager, ViewerModule } from './ModuleViewerManager';
import { useSearchParams } from 'next/navigation';
import {
    Button,
    CircularProgress,
    Paper,
    Stack,
    Typography,
    Chip,
    Alert,
    Box,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    AlertCircle,
    Download,
    RefreshCw,
    FileQuestion,
    Eye,
    ChevronDown,
    Check
} from 'lucide-react';
import { useFileViewerLayout } from './FileViewerLayout';
import { useFilePreflight } from '@/hooks/useFilePreflight';

export default function FileContentViewer() {

    const { getViewerById, getSupportedViewers } = useViewerManager();
    const searchParams = useSearchParams();
    const fileLayout = useFileViewerLayout();

    const fileId = useMemo(() => fileLayout.firstId, [fileLayout?.firstId]);
    const fileSubpath = useMemo(() => fileLayout.listId.slice(1), [fileLayout?.listId]);

    const [viewerPending, setViewerPending] = useState(true);
    const [viewerMenuAnchor, setViewerMenuAnchor] = useState<null | HTMLElement>(null);
    const { success, error, loading, file } = useFilePreflight(fileId, fileSubpath);

    const defaultViewerModule = useViewerForFile(file);
    const supportedViewers = file ? getSupportedViewers(file) : [];
    const [viewerModule, setViewerModule] = useState<ViewerModule | null>(null);

    // Handle viewer module selection
    useEffect(() => {
        setViewerPending(true);
        const moduleId = searchParams.get("with");

        if (moduleId) {
            const module = getViewerById(moduleId);
            setViewerModule(module);
        } else if (defaultViewerModule) {
            setViewerModule(defaultViewerModule);
        }

        setTimeout(() => {
            setViewerPending(false);
        }, 100);
    }, [searchParams, getViewerById, defaultViewerModule]);

    useEffect(() => {
        fileLayout.setFile(file || null);
    }, [file]);

    const handleDownload = () => {
        if (file) {
            // Implement download logic here
            const downloadUrl = `/api/files/${file.id}/download`;
            window.open(downloadUrl, '_blank');
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleViewerMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setViewerMenuAnchor(event.currentTarget);
    };

    const handleViewerMenuClose = () => {
        setViewerMenuAnchor(null);
    };

    const handleViewerChange = (module: ViewerModule) => {
        setViewerModule(module);
        // Update URL with the selected viewer
        const url = new URL(window.location.href);
        url.searchParams.set('with', module.id);
        window.history.replaceState({}, '', url.toString());
        handleViewerMenuClose();
        setViewerPending(true);
        setTimeout(() => setViewerPending(false), 50);
    };

    const renderErrorState = () => (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
            <AlertCircle size={48} color="#f44336" />
            <Typography variant="h6" color="error.main">
                Failed to Load File
            </Typography>
            <Typography color="text.secondary" textAlign="center">
                {error || 'An unexpected error occurred while loading the file.'}
            </Typography>
            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={handleRefresh}>
                    Retry
                </Button>
                {file && (
                    <Button
                        variant="contained"
                        startIcon={<Download size={16} />}
                        onClick={handleDownload}>
                        Download
                    </Button>
                )}
            </Stack>
        </Stack>
    );

    const renderNoViewerState = () => (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
            <FileQuestion size={48} color="#ff9800" />
            <Typography variant="h6" color="warning.main">
                No Viewer Available
            </Typography>
            <Typography color="text.secondary" textAlign="center">
                No suitable viewer found for this file type.
                {supportedViewers.length > 0 && ' Try selecting a different viewer.'}
            </Typography>

            {supportedViewers.length > 0 && (
                <>
                    <Button
                        variant="outlined"
                        endIcon={<ChevronDown size={16} />}
                        onClick={handleViewerMenuOpen}>
                        Select Viewer
                    </Button>
                    <Menu
                        anchorEl={viewerMenuAnchor}
                        open={Boolean(viewerMenuAnchor)}
                        onClose={handleViewerMenuClose}>
                        {supportedViewers.map((viewer) => (
                            <MenuItem
                                key={viewer.id}
                                onClick={() => handleViewerChange(viewer)}
                                selected={viewerModule?.id === viewer.id}>
                                {viewerModule?.id === viewer.id && (
                                    <ListItemIcon>
                                        <Check size={16} />
                                    </ListItemIcon>
                                )}
                                <ListItemText
                                    primary={viewer.name}
                                    inset={viewerModule?.id !== viewer.id}
                                />
                            </MenuItem>
                        ))}
                    </Menu>
                </>
            )}

            {file && (
                <Button
                    variant="contained"
                    startIcon={<Download size={16} />}
                    onClick={handleDownload}>
                    Download File
                </Button>
            )}
        </Stack>
    );

    const renderLoadingState = () => (
        <Stack flex={1} justifyContent="center" alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
                Loading file information...
            </Typography>
        </Stack>
    );

    const renderContent = () => {
        if (loading || viewerPending) {
            return renderLoadingState();
        }

        if (error || !success) {
            return renderErrorState();
        }

        if (!viewerModule) {
            return renderNoViewerState();
        }

        const ViewerComponent = viewerModule.component;

        return (
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Viewer header with controls */}
                <Paper
                    elevation={1}
                    sx={{
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 0,
                        borderBottom: 1,
                        borderColor: 'divider'
                    }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {viewerModule.icon && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {viewerModule.icon}
                            </Box>
                        )}
                        <Typography variant="subtitle2">
                            {viewerModule.name}
                        </Typography>
                    </Stack>

                    <Stack direction="row" alignItems={"center"} spacing={0.5}>
                        {supportedViewers.length > 1 && (
                            <Chip
                                label={`Buka dengan`}
                                size="small"
                                variant="outlined"
                                onClick={handleViewerMenuOpen}
                                deleteIcon={<ChevronDown size={16} />}
                                onDelete={handleViewerMenuOpen}
                            />
                        )}
                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={handleRefresh}>
                                <RefreshCw size={18} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Paper>

                {/* Viewer menu */}
                <Menu
                    anchorEl={viewerMenuAnchor}
                    open={Boolean(viewerMenuAnchor)}
                    onClose={handleViewerMenuClose}>
                    <MenuItem disabled>
                        <ListItemText primary="Select Viewer" />
                    </MenuItem>
                    <Divider />
                    {supportedViewers.map((viewer) => (
                        <MenuItem
                            key={viewer.id}
                            onClick={() => handleViewerChange(viewer)}
                            selected={viewerModule?.id === viewer.id}>
                            {viewerModule?.id === viewer.id ? (
                                <ListItemIcon>
                                    <Check size={16} />
                                </ListItemIcon>
                            ) : (
                                <ListItemIcon>
                                    {viewer.icon}
                                </ListItemIcon>
                            )}
                            <ListItemText primary={viewer.name} />
                        </MenuItem>
                    ))}
                </Menu>

                {/* Viewer content */}
                <Box sx={{ height: 'calc(100% - 48px)', overflow: 'hidden' }}>
                    <ViewerComponent file={file!} />
                </Box>
            </Box>
        );
    };


    return (
        <Paper
            sx={{
                flex: 1,
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: 2,
                bgcolor: 'background.paper',
                position: 'relative'
            }}>
            {renderContent()}

            {/* Global error alert */}
            {error && !loading && (
                <Alert
                    severity="error"
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        maxWidth: 400,
                        zIndex: 10
                    }}
                    action={
                        <Button color="inherit" size="small" onClick={handleRefresh}>
                            Retry
                        </Button>
                    }>
                    {error}
                </Alert>
            )}
        </Paper>
    );
}