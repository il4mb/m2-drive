import { Box, Stack, Paper, Typography, Chip, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';
import { ViewerModule } from './ModuleViewerManager';
import { useEffect, useState } from 'react';
import { File } from '@/entities/File';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';

interface ViewerContentProps {
    viewerModule: ViewerModule;
    file: File;
    supportedViewers: ViewerModule[];
    onViewerChange: (module: ViewerModule) => void;
    onRefresh: () => void;
}

export function ViewerContent({ viewerModule, file, supportedViewers, onViewerChange, onRefresh }: ViewerContentProps) {


    const { addAction } = useActionsProvider();
    const [viewerMenuAnchor, setViewerMenuAnchor] = useState<null | HTMLElement>(null);
    const ViewerComponent = viewerModule.component;

    const handleViewerMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setViewerMenuAnchor(event.currentTarget);
    };

    const handleViewerMenuClose = () => {
        setViewerMenuAnchor(null);
    };


    useEffect(() => {
        if (viewerModule.name.toLowerCase() == "folder") return;
        return addAction("viewer", {
            component: () => (
                <Stack>
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
                </Stack>
            )
        })
    }, []);

    return (
        <Box component={Stack} sx={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
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
                        onClick={() => {
                            onViewerChange(viewer);
                            handleViewerMenuClose();
                        }}
                        selected={viewerModule.id === viewer.id}>
                        {viewerModule.id === viewer.id ? (
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
            <Box component={Stack} sx={{ flex: 1, height: 'calc(100% - 40px)', overflow: 'hidden' }}>
                <ViewerComponent file={file} />
            </Box>
        </Box>
    );
}