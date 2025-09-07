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
        const { file } = state;
        const { getSupportedViewers, openWithSupportedViewer } = useViewerManager();
        const [showAll, setShowAll] = useState(false);
        const supportedModules = useMemo(() => getSupportedViewers(file), [file, getSupportedViewers]);
        const displayedModules = showAll ? supportedModules : supportedModules.slice(0, 3);
        const hasMoreModules = supportedModules.length > 3;

        const handleViewerSelect = (viewerId: string) => {
            openWithSupportedViewer(file, viewerId);
        }

        const handleShowAll = () => {
            setShowAll(true);
        }

        const handleShowLess = () => {
            setShowAll(false);
        }

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
                        </Stack>
                    )}
                </Box>
            </Popover>
        );
    }
});