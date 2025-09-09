'use client'

import { Folder, Square, Download, ExternalLink, Info, Copy } from "lucide-react"
import { ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entities/File";
import { useState } from "react";
import { motion } from "motion/react"
import {
    Button,
    Chip,
    Stack,
    Typography,
    Paper,
    Box,
    IconButton,
    Divider,
    Tooltip,
    Alert,
    Snackbar
} from "@mui/material";
import { formatFileSize, formatLocaleDate } from "@/libs/utils";
import { useTheme } from "@mui/material/styles";
import { FileIcon } from "@untitledui/file-icons";

export const DefaultViewerComponent: React.FC<{ file: File<'file'> }> = ({ file }) => {

    const theme = useTheme();
    const fileSize = (file.meta as any)?.size || 0;
    const mimeType = file.meta?.mimeType || 'unknown';
    const createdAt = file.createdAt || 0;;
    const updatedAt = file.updatedAt || 0;

    const handleDownload = () => {
        // Implement download logic
        console.log('Downloading file:', file.name);
    };

    const handleOpenInBrowser = () => {
        // Implement open in browser logic
        console.log('Opening file in browser:', file.name);
    };



    const getFileTypeColor = () => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'pdf': return '#f40f02';
            case 'doc': case 'docx': return '#2b579a';
            case 'xls': case 'xlsx': return '#217346';
            case 'ppt': case 'pptx': return '#d24726';
            case 'zip': case 'rar': return '#905ea9';
            default: return theme.palette.primary.main;
        }
    };

    return (
        <Stack
            flex={1}
            alignItems="center"
            justifyContent="center"
            width={'100%'}
            height={'100%'}
            spacing={4}
            sx={{
                p: 4,
                background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
                minHeight: '100%'
            }}>
            {/* File Icon */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}>
                <Box
                    sx={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 100,
                        height: 100,
                        borderRadius: 100,
                        bgcolor: `#ccc2`,
                        border: `2px solid ${getFileTypeColor()}30`,
                        boxShadow: theme.shadows[4],
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -10,
                            left: -10,
                            right: -10,
                            bottom: -10,
                            borderRadius: 6,
                            bgcolor: `${getFileTypeColor()}08`,
                            zIndex: -1
                        }
                    }}>
                    <FileIcon size={50} variant="solid" type={file.meta?.mimeType || 'empty'} />
                </Box>
            </motion.div>

            {/* File Information */}
            <Stack
                alignItems="center"
                spacing={2}
                sx={{ maxWidth: 500, textAlign: 'center' }}>
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}>
                    <Typography
                        variant="h4"
                        fontWeight="700"
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.text.secondary} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                        }}>
                        {file.name}
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}>
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        <Chip
                            icon={<Info size={14} />}
                            label={formatFileSize(fileSize)}
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                        <Chip
                            label={mimeType.split('/')[1]?.toUpperCase() || mimeType.toUpperCase()}
                            variant="filled"
                            size="small"
                            sx={{
                                bgcolor: getFileTypeColor(),
                                color: 'white',
                                fontWeight: 600
                            }}
                        />
                    </Stack>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}>
                    <Stack spacing={0.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            Created: {formatLocaleDate(createdAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Modified: {formatLocaleDate(updatedAt)}
                        </Typography>
                    </Stack>
                </motion.div>
            </Stack>

            {/* Action Buttons */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="center">
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<Download size={20} />}
                        onClick={handleDownload}
                        sx={{
                            minWidth: 200,
                            height: 50,
                            borderRadius: 3,
                            bgcolor: getFileTypeColor(),
                            '&:hover': {
                                bgcolor: getFileTypeColor(),
                                transform: 'translateY(-2px)',
                                boxShadow: theme.shadows[8]
                            },
                            transition: 'all 0.2s ease'
                        }}>
                        Download File
                    </Button>

                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<ExternalLink size={20} />}
                        onClick={handleOpenInBrowser}
                        sx={{
                            minWidth: 200,
                            height: 50,
                            borderRadius: 3,
                            borderColor: getFileTypeColor(),
                            color: getFileTypeColor(),
                            '&:hover': {
                                borderColor: getFileTypeColor(),
                                bgcolor: `${getFileTypeColor()}10`,
                                transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.2s ease'
                        }}>
                        Open in Browser
                    </Button>
                </Stack>
            </motion.div>
        </Stack>
    );
};

export default {
    priority: 10,
    id: 'default-viewer',
    name: "File Viewer",
    icon: <Square strokeWidth={3} size={18} />,
    supports: (_, file) => file.type == "file",
    component: DefaultViewerComponent,
} as ViewerModule;