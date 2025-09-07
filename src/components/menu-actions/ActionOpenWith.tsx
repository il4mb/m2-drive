'use client'

import { AppWindow, FolderOpen } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { Box, ListItemIcon, ListItemText, MenuItem, Popover, Stack, Typography, Divider, Button, Chip } from "@mui/material";
import { useViewerManager } from "../../viewer/ModuleViewerManager";
import { useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

type State = {
    file: File;
}

export default createContextMenu<State>({
    icon: AppWindow,
    label: "Buka dengan...",
    show({ file }) {
        return file.type == "file";
    },
    component({ state, anchor, resolve }) {

        const router = useRouter();
        const { file } = state;
        const { getSupportedViewers } = useViewerManager();
        const [showAll, setShowAll] = useState(false);

        const supportedModules = useMemo(() => getSupportedViewers(file), [file, getSupportedViewers]);

        // Show top 3 modules by default, or all if showAll is true
        const displayedModules = showAll ? supportedModules : supportedModules.slice(0, 3);
        const hasMoreModules = supportedModules.length > 3;

        const handleViewerSelect = (viewerId: string) => {
            router.push(`/open/${file.id}?with=${viewerId}`);
        };

        const handleDownload = () => {

        };

        const handleOpenInBrowser = () => {

        };

        const handleShowAll = () => {
            setShowAll(true);
        };

        const handleShowLess = () => {
            setShowAll(false);
        };

        return (
            <Popover
                anchorEl={anchor}
                open={true}
                onClose={() => resolve(false)}
                anchorOrigin={{
                    horizontal: "right",
                    vertical: "bottom"
                }}
                transformOrigin={{
                    horizontal: "left",
                    vertical: "top"
                }}
                sx={{
                    '& .MuiPaper-root': {
                        width: '100%',
                        maxWidth: 200,
                        maxHeight: 400,
                        overflow: 'auto'
                    }
                }}>
                <Box sx={{ p: 1 }}>
                    {/* Header */}
                    <Stack sx={{ px: 2, py: 1.5 }} spacing={0.5}>
                        <Typography color="text.secondary" noWrap>
                            {file.name}
                        </Typography>
                    </Stack>

                    

                    <Divider />

                    {/* Viewer Options */}
                    <Stack sx={{ py: 0.5 }}>
                   

                        {displayedModules.map((module) => (
                            <MenuItem
                                key={module.id}
                                onClick={() => handleViewerSelect(module.id)}
                                sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {typeof module.icon === 'string' ? (
                                        <Typography sx={{ fontSize: '1.2rem' }}>
                                            {module.icon}
                                        </Typography>
                                    ) : (
                                        module.icon
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={module.name}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                />
                            </MenuItem>
                        ))}

                        {hasMoreModules && !showAll && (
                            <MenuItem onClick={handleShowAll} sx={{ py: 1 }}>
                                <ListItemText
                                    primary={`Lihat ${supportedModules.length - 3} aplikasi lainnya...`}
                                    primaryTypographyProps={{
                                        variant: 'caption',
                                        color: 'primary',
                                        sx: { textAlign: 'center' }
                                    }}
                                />
                            </MenuItem>
                        )}

                        {showAll && hasMoreModules && (
                            <MenuItem onClick={handleShowLess} sx={{ py: 1 }}>
                                <ListItemText
                                    primary="Lihat lebih sedikit"
                                    primaryTypographyProps={{
                                        variant: 'caption',
                                        color: 'primary',
                                        sx: { textAlign: 'center' }
                                    }}
                                />
                            </MenuItem>
                        )}
                    </Stack>

                    {supportedModules.length === 0 && (
                        <Stack sx={{ px: 2, py: 2 }} spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                Tidak ada aplikasi yang tersedia untuk file ini
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleDownload}>
                                Download File
                            </Button>
                        </Stack>
                    )}
                </Box>
            </Popover>
        );
    }
});

// Utility function to use this context menu
export const useOpenWithMenu = () => {
    // This would be integrated with your context menu system
    // For example, if you have a global context menu manager:

    const openMenu = (file: File, options?: {
        onOpen?: (viewerId: string, file: File) => void;
        onDownload?: (file: File) => void;
        onOpenInBrowser?: (file: File) => void;
    }) => {
        // This would trigger the context menu opening
        // The implementation depends on your context menu system
        console.log('Opening Open With menu for:', file.name, options);
    };

    return openMenu;
};

// Example usage component
export const OpenWithButton = ({ file }: { file: File }) => {
    const openMenu = useOpenWithMenu();

    const handleOpenWithClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        openMenu(file, {
            onOpen: (viewerId, file) => {
                console.log('Opening with viewer:', viewerId, file.name);
                // Handle the viewer selection
            },
            onDownload: (file) => {
                console.log('Downloading:', file.name);
                // Handle download
            },
            onOpenInBrowser: (file) => {
                console.log('Opening in browser:', file.name);
                // Handle browser opening
            }
        });
    };

    return (
        <Button
            variant="outlined"
            size="small"
            startIcon={<FolderOpen size={16} />}
            onClick={handleOpenWithClick}
            sx={{ minWidth: 'auto' }}
        >
            Buka Dengan
        </Button>
    );
};