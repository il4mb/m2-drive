import { Stack, Typography, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { FileQuestion, Download, ChevronDown, Check } from 'lucide-react';
import { ViewerModule } from './ModuleViewerManager';
import { useState } from 'react';
import { File } from '@/entity/File';

interface NoViewerStateProps {
    file?: File | null;
    supportedViewers: ViewerModule[];
    onViewerChange: (module: ViewerModule) => void;
}

export function NoViewerState({ file, supportedViewers, onViewerChange }: NoViewerStateProps) {
    const [viewerMenuAnchor, setViewerMenuAnchor] = useState<null | HTMLElement>(null);

    const handleViewerMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setViewerMenuAnchor(event.currentTarget);
    };

    const handleViewerMenuClose = () => {
        setViewerMenuAnchor(null);
    };

    const handleDownload = () => {
        if (file) {
            const downloadUrl = `/api/files/${file.id}/download`;
            window.open(downloadUrl, '_blank');
        }
    };

    return (
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
                                onClick={() => {
                                    onViewerChange(viewer);
                                    handleViewerMenuClose();
                                }}>
                                <ListItemIcon>
                                    {viewer.icon}
                                </ListItemIcon>
                                <ListItemText primary={viewer.name} />
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
}