'use client'

import { FileText, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, X, Presentation, Play, Pause, RotateCw, Layout, Grid } from "lucide-react"
import {
    Box,
    Stack,
    Typography,
    IconButton,
    CircularProgress,
    useTheme,
    Paper,
    Tooltip,
    LinearProgress,
    Chip,
    Dialog,
    Slide,
    ToggleButtonGroup,
    ToggleButton
} from "@mui/material";
import { usePresignUrlWith } from "@/hooks/usePresignUrl";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { File } from "@/entities/File";
import { ViewerModule } from "../ModuleViewerManager";
import { Task } from "@/entities/Task";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { getOne, Json } from "@/libs/websocket/query";
import { motion, AnimatePresence } from "framer-motion";
import { TransitionProps } from '@mui/material/transitions';
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import { Document, Page, pdfjs } from 'react-pdf';
import { pdfOptions } from "@/components/context/ContextInjector";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const supportedMimes = new Set([
    // Word
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.text-template",
    "text/rtf",
    "application/wordperfect",

    // Excel
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.spreadsheet-template",
    "application/x-dif",

    // PowerPoint
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    "application/vnd.openxmlformats-officedocument.presentationml.template",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.presentation-template",
]);

export const isConvertable = (mime: string) => supportedMimes.has(mime);

interface DocumentViewerProps {
    file: File<'file'>;
}

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const DocumentViewerWithTask: React.FC<DocumentViewerProps> = ({ file }) => {
    const [task, setTask] = useState<Task | null>(null);

    useEffect(() => {
        if (!isConvertable(file.meta?.mimeType || '')) return;
        return onSnapshot(
            getOne("task")
                .where("type", "==", "convert-pdf")
                .where("status", "IN", ["pending", "processing", "completed", "failed"])
                .where(Json("payload", "fileId"), "==", file.id),
            (task) => {
                setTask(task);
            }
        );
    }, [file.id]);

    if (task && task.status !== "completed") {
        return (
            <Stack justifyContent="center" alignItems="center" sx={{ flex: 1, p: 3 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <CircularProgress size={60} thickness={4} />
                </motion.div>
                <Typography variant="body2" mt={3} color="text.secondary">
                    {task.status === "processing"
                        ? "Mengonversi dokumen..."
                        : "Memulai konversi..."}
                </Typography>
                {task.status === "processing" && (
                    <Box sx={{ width: '100%', maxWidth: 360, mt: 2 }}>
                        <LinearProgress />
                    </Box>
                )}
                {task.status === "failed" && (
                    <Chip
                        label="Konversi gagal"
                        color="error"
                        variant="outlined"
                        sx={{ mt: 2 }}
                    />
                )}
            </Stack>
        );
    }

    return <DocumentViewerComponent file={file} task={task} />;
}

// Main viewer component
interface DocumentViewerComponentProps extends DocumentViewerProps {
    task?: Task | null;
}

export const DocumentViewerComponent: React.FC<DocumentViewerComponentProps> = ({ file, task }) => {
    const url = usePresignUrlWith({
        fileId: file.id,
        metaKey: isConvertable(file.meta?.mimeType || '') ? "pdfObjectKey" : "Key"
    });
    const [numPages, setNumPages] = useState<number>(0);
    const [page, setPage] = useState(1);
    const [scale, setScale] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [presentationMode, setPresentationMode] = useState(false);
    const [isAutoplay, setIsAutoplay] = useState(false);
    const [pageDirection, setPageDirection] = useState(0); // 0: initial, 1: next, -1: previous
    const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
    const [rotation, setRotation] = useState(0);
    const [pageDimensions, setPageDimensions] = useState<Array<{ width: number; height: number; ratio: number }>>([]);
    const autoplayIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const theme = useTheme();
    const documentRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    const totalPages = numPages;

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
        setIsLoading(false);
        setError(null);
    }

    function onDocumentLoadError(error: Error): void {
        console.error('Error loading document:', error);
        setError(error.message);
        setIsLoading(false);
    }

    const onPageLoadSuccess = useCallback((page: any, index: number) => {
        const { width, height } = page.getViewport({ scale: 1 });
        const ratio = width / height;
        setPageDimensions(prev => {
            const newDims = [...prev];
            newDims[index] = { width, height, ratio };
            return newDims;
        });
    }, []);

    const handleDownload = useCallback(() => {
        if (!url) return;

        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [url, file.name]);

    const handleZoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.2, 3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale(prev => Math.max(prev - 0.2, 0.5));
    }, []);

    const handleRotate = useCallback(() => {
        setRotation(prev => (prev + 90) % 360);
    }, []);

    const handleLayoutChange = useCallback((event: React.MouseEvent<HTMLElement>, newLayout: 'vertical' | 'horizontal') => {
        if (newLayout !== null) {
            setLayoutMode(newLayout);
        }
    }, []);

    const handlePresentationMode = useCallback(() => {
        enqueueSnackbar("Gunakan tombol panah untuk navigasi • Esc untuk keluar", {
            variant: "info",
            action: CloseSnackbar
        });

        // Request fullscreen
        const presentationContainer = document.documentElement;
        if (presentationContainer.requestFullscreen) {
            presentationContainer.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        }

        setPresentationMode(true);
    }, []);

    const handleClosePresentation = useCallback(() => {
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                console.error('Error attempting to exit fullscreen:', err);
            });
        }

        // Stop autoplay if active
        if (autoplayIntervalRef.current) {
            clearInterval(autoplayIntervalRef.current);
            autoplayIntervalRef.current = null;
        }
        setIsAutoplay(false);

        setPresentationMode(false);
    }, []);

    const toggleAutoplay = useCallback(() => {
        if (isAutoplay) {
            // Stop autoplay
            if (autoplayIntervalRef.current) {
                clearInterval(autoplayIntervalRef.current);
                autoplayIntervalRef.current = null;
            }
            setIsAutoplay(false);
        } else {
            // Start autoplay - change page every 5 seconds
            setIsAutoplay(true);
            autoplayIntervalRef.current = setInterval(() => {
                setPage(prev => {
                    if (prev >= totalPages) {
                        // If we're at the last page, stop autoplay
                        if (autoplayIntervalRef.current) {
                            clearInterval(autoplayIntervalRef.current);
                            autoplayIntervalRef.current = null;
                        }
                        setIsAutoplay(false);
                        return prev;
                    }
                    setPageDirection(1);
                    return prev + 1;
                });
            }, 5000); // 5 seconds per slide
        }
    }, [isAutoplay, totalPages]);

    const goToPreviousPage = useCallback(() => {
        setPageDirection(-1);
        setPage(prev => Math.max(prev - 1, 1));
    }, []);

    const goToNextPage = useCallback(() => {
        setPageDirection(1);
        setPage(prev => Math.min(prev + 1, totalPages));
    }, [totalPages]);

    // Calculate optimal page width based on layout mode
    const getPageWidth = useCallback((pageNumber: number) => {
        if (layoutMode === 'horizontal') {
            return Math.min(800, viewerRef.current?.clientWidth || 800);
        }

        // For vertical layout, use container width but limit to 800px
        return Math.min(viewerRef.current?.clientWidth || 800, 800) * scale;
    }, [layoutMode, scale]);

    // Calculate optimal page size for presentation mode (maintains aspect ratio)
    const getPresentationPageSize = useCallback((pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > pageDimensions.length || !pageDimensions[pageNumber - 1]) {
            return { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 };
        }

        const { ratio } = pageDimensions[pageNumber - 1];
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;

        // Calculate dimensions that maintain aspect ratio and fit within screen
        let width = maxWidth;
        let height = width / ratio;

        if (height > maxHeight) {
            height = maxHeight;
            width = height * ratio;
        }

        return { width, height };
    }, [pageDimensions]);

    // Keyboard navigation for presentation mode
    useEffect(() => {
        if (!presentationMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClosePresentation();
            } else if (e.key === 'ArrowLeft') {
                goToPreviousPage();
            } else if (e.key === 'ArrowRight') {
                goToNextPage();
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                // Space to toggle autoplay
                toggleAutoplay();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [presentationMode, page, totalPages, handleClosePresentation, toggleAutoplay, goToPreviousPage, goToNextPage]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (autoplayIntervalRef.current) {
                clearInterval(autoplayIntervalRef.current);
            }
        };
    }, []);

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                handleClosePresentation();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [handleClosePresentation]);

    // Reset page direction after animation completes
    useEffect(() => {
        if (pageDirection !== 0) {
            const timer = setTimeout(() => setPageDirection(0), 300);
            return () => clearTimeout(timer);
        }
    }, [pageDirection]);

    // Render the document content with page transitions
    const renderDocumentContent = () => {
        if (!url) return null;

        if (layoutMode === 'horizontal') {
            return (
                <Document
                    options={pdfOptions}
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                            <CircularProgress />
                        </Box>
                    }>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'nowrap',
                        overflowX: 'auto',
                        gap: 2,
                        p: 2,
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start'
                    }}>
                        {Array.from(new Array(numPages), (el, index) => (
                            <Box
                                key={`page_${index + 1}`}
                                sx={{
                                    flex: '0 0 auto',
                                    boxShadow: theme.shadows[2],
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    backgroundColor: 'white'
                                }}
                            >
                                <Page
                                    pageNumber={index + 1}
                                    width={getPageWidth(index + 1)}
                                    rotate={rotation}
                                    onLoadSuccess={(page) => onPageLoadSuccess(page, index)}
                                />
                            </Box>
                        ))}
                    </Box>
                </Document>
            );
        }

        // Vertical layout (default)
        return (
            <Document
                options={pdfOptions}
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                        <CircularProgress />
                    </Box>
                }>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {Array.from(new Array(numPages), (el, index) => (
                        <Box
                            key={`page_${index + 1}`}
                            sx={{
                                boxShadow: theme.shadows[2],
                                borderRadius: 1,
                                overflow: 'hidden',
                                backgroundColor: 'white'
                            }}
                        >
                            <Page
                                pageNumber={index + 1}
                                width={getPageWidth(index + 1)}
                                rotate={rotation}
                                onLoadSuccess={(page) => onPageLoadSuccess(page, index)}
                            />
                        </Box>
                    ))}
                </Box>
            </Document>
        );
    };

    // Render the presentation mode document content with page transitions
    const renderPresentationContent = () => {
        if (!url) return null;

        return (
            <Document
                options={pdfOptions}
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}>
                <AnimatePresence mode="wait" custom={pageDirection}>
                    <motion.div
                        key={page}
                        custom={pageDirection}
                        initial={{
                            opacity: 0,
                            x: pageDirection === 1 ? 100 : pageDirection === -1 ? -100 : 0,
                            scale: pageDirection !== 0 ? 0.95 : 1
                        }}
                        animate={{
                            opacity: 1,
                            x: 0,
                            scale: 1
                        }}
                        exit={{
                            opacity: 0,
                            x: pageDirection === 1 ? -100 : pageDirection === -1 ? 100 : 0,
                            scale: 0.95
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                        <Page
                            pageNumber={page}
                            {...getPresentationPageSize(page)}
                            rotate={rotation}
                        />
                    </motion.div>
                </AnimatePresence>
            </Document>
        );
    };

    return (
        <>
            <Stack sx={{
                height: "100%",
                flex: 1,
                overflow: 'hidden'
            }}>
                {/* Enhanced Toolbar with animations */}
                <Paper
                    elevation={2}
                    sx={{
                        borderRadius: 0,
                        p: 1
                    }}
                    component={motion.div}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>

                        <Box sx={{ width: 1, height: 24, mx: 1, bgcolor: 'divider' }} />

                        <Tooltip title="Perkecil">
                            <span>
                                <IconButton
                                    onClick={handleZoomOut}
                                    disabled={scale <= 0.5}
                                    size="small">
                                    <ZoomOut size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center' }}>
                            {Math.round(scale * 100)}%
                        </Typography>

                        <Tooltip title="Perbesar">
                            <span>
                                <IconButton
                                    onClick={handleZoomIn}
                                    disabled={scale >= 3}
                                    size="small">
                                    <ZoomIn size={18} />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Putar halaman">
                            <IconButton
                                onClick={handleRotate}
                                size="small">
                                <RotateCw size={18} />
                            </IconButton>
                        </Tooltip>

                        <Box sx={{ width: 1, height: 24, mx: 1, bgcolor: 'divider' }} />

                        <Tooltip title="Mode presentasi">
                            <IconButton
                                onClick={handlePresentationMode}
                                size="small"
                                color="primary">
                                <Presentation size={18} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Paper>

                {/* Viewer with enhanced loading states */}
                <Box
                    ref={viewerRef}
                    flex={1}
                    className="no-scrollbar"
                    overflow={"auto"}
                    sx={{
                        bgcolor: layoutMode === 'horizontal' ? 'grey.100' : 'background.default',
                        ...(layoutMode === 'horizontal' && {
                            '&::-webkit-scrollbar': {
                                height: 8,
                            },
                            '&::-webkit-scrollbar-track': {
                                backgroundColor: 'grey.200',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'grey.400',
                                borderRadius: 2,
                            },
                        })
                    }}
                >
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100%'
                            }}>
                            <Paper sx={{ p: 3, textAlign: "center" }}>
                                <Typography color="error" variant="body2">
                                    Gagal memuat dokumen: {error}
                                </Typography>
                            </Paper>
                        </motion.div>
                    )}

                    {!error && url && (
                        <Box
                            ref={documentRef}
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            sx={{
                                p: layoutMode === 'horizontal' ? 0 : 2,
                                minHeight: '100%'
                            }}
                        >
                            {renderDocumentContent()}
                        </Box>
                    )}
                </Box>

            </Stack>

            {/* Presentation Mode Dialog - Only renders when active */}
            <Dialog
                fullScreen
                open={presentationMode}
                onClose={handleClosePresentation}
                TransitionComponent={Transition}
                sx={{
                    '& .MuiDialog-container': {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(4px)',
                    }
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        height: '100vh',
                        backgroundColor: 'black',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                    {/* Presentation mode controls */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 10,
                            display: 'flex',
                            gap: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: 8,
                            padding: 8
                        }}>
                        <Tooltip title={isAutoplay ? "Jeda" : "Putar otomatis"}>
                            <IconButton
                                onClick={toggleAutoplay}
                                sx={{ color: 'white' }}
                                size="small">
                                {isAutoplay ? <Pause size={18} /> : <Play size={18} />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Keluar presentasi">
                            <IconButton
                                onClick={handleClosePresentation}
                                sx={{ color: 'white' }}
                                size="small">
                                <X size={18} />
                            </IconButton>
                        </Tooltip>
                    </motion.div>

                    {/* Page indicator */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        style={{
                            position: 'absolute',
                            bottom: 16,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            color: 'white'
                        }}>
                        <Typography variant="body2">
                            {page} / {totalPages}
                        </Typography>
                    </motion.div>

                    {/* Document in presentation mode */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            height: '100%'
                        }}>
                        {renderPresentationContent()}
                    </motion.div>
                </Box>
            </Dialog>
        </>
    );
};

export default {
    priority: 10,
    id: 'document-viewer',
    name: "Document Viewer",
    icon: <FileText size={18} />,
    supports: [
        // Word
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.text-template",
        "text/rtf",
        "application/wordperfect",

        // Excel
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.spreadsheet-template",
        "application/x-dif",

        // PowerPoint
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
        "application/vnd.openxmlformats-officedocument.presentationml.template",
        "application/vnd.oasis.opendocument.presentation",
        "application/vnd.oasis.opendocument.presentation-template",

        'application/pdf',
    ],
    component: DocumentViewerWithTask
} as ViewerModule;