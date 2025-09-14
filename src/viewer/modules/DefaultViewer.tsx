'use client'

import { Square, Download, Info } from "lucide-react"
import { ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entities/File";
import { motion } from "motion/react"
import {
    Button,
    Chip,
    Stack,
    Typography,
    Box
} from "@mui/material";
import { formatFileSize, formatDateFromEpoch } from "@/libs/utils";
import { useTheme } from "@mui/material/styles";
import { FileIcon } from "@untitledui/file-icons";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import { useState } from "react";

export const DefaultViewerComponent: React.FC<{ file: File<'file'> }> = ({ file }) => {

    const theme = useTheme();
    const fileSize = (file.meta as any)?.size || 0;
    const mimeType = file.meta?.mimeType || 'unknown';
    const createdAt = file.createdAt || 0;
    const updatedAt = file.updatedAt || 0;

    const [download, setDownload] = useState(false);

    const handleDownload = async () => {

        try {
            if (download) return;
            setDownload(true);

            const name = `${file.name}.${file.meta?.ext || 'bin'}`;
            const result = await invokeFunction("getFileURLPresign", { fileId: file.id });
            if (!result.success || !result.data?.url) {
                throw new Error(result.error);
            }

            const link = document.createElement("a");
            link.href = result.data.url;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error: any) {
            enqueueSnackbar(error.message || "Unknown Error", {
                variant: 'error',
                action: CloseSnackbar
            })
        } finally {
            setDownload(false);
        }
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
                    <Stack direction="row" gap={1} justifyContent="center" flexWrap="wrap">
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
                            // sx={{
                            //     bgcolor: getFileTypeColor(),
                            //     // color: 'white',
                            //     fontWeight: 600
                            // }}
                        />
                    </Stack>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}>
                    <Stack spacing={0.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            Created: {formatDateFromEpoch(createdAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Modified: {formatDateFromEpoch(updatedAt)}
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
                        loading={download}
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