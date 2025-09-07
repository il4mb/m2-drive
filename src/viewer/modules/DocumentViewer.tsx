'use client'

import { FileText, ZoomIn, ZoomOut, Download, Printer, RotateCw, Search, ChevronLeft, ChevronRight, BookOpen, FileIcon } from "lucide-react"
import { ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    Stack,
    IconButton,
    Typography,
    Box,
    Paper,
    Slider,
    TextField,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,
    Tooltip,
    CircularProgress
} from "@mui/material";
import { motion, AnimatePresence } from "motion/react"
import usePresignUrl from "@/hooks/usePresignUrl";

interface DocumentViewerProps {
    file: File<'file'>;
}

export const DocumentViewerComponent: React.FC<DocumentViewerProps> = ({ file }) => {
    const source = usePresignUrl(file.meta?.Key);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<number[]>([]);
    const [currentSearchResult, setCurrentSearchResult] = useState(0);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

    const supportedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    // Load PDF.js with proper Next.js compatibility
    useEffect(() => {
        if (file.meta?.mimeType !== 'application/pdf') return;

        const loadPdfJs = async () => {
            try {
                // Use dynamic import with proper configuration for Next.js
                const pdfjs = await import('pdfjs-dist/lib/pdf');
                // @ts-ignore
                const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');

                // Set worker source - use the default worker from the package
                pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

                return pdfjs;
            } catch (error) {
                console.error('Failed to load PDF.js:', error);
                setError('Failed to load PDF viewer. Please download the file to view it.');
                return null;
            }
        };

        loadPdfJs();
    }, [file.meta?.mimeType]);

    // Load PDF document
    useEffect(() => {
        if (!source || file.meta?.mimeType !== 'application/pdf') return;

        const loadDocument = async () => {
            try {
                setIsLoading(true);

                // Dynamically import PDF.js
                const pdfjs = await import('pdfjs-dist');

                // For Next.js compatibility, we need to handle the worker differently
                if (typeof window !== 'undefined') {
                    // @ts-ignore - PDFJS is available globally when imported
                    const loadingTask = pdfjs.getDocument({
                        url: source,
                        // Use built-in worker for better compatibility
                        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
                        cMapPacked: true,
                    });

                    const doc = await loadingTask.promise;
                    setPdfDoc(doc);
                    setTotalPages(doc.numPages);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load PDF:', error);
                setError('Failed to load document. The file may be corrupted or unsupported.');
                setIsLoading(false);
            }
        };

        loadDocument();
    }, [source, file.meta?.mimeType]);

    // Render PDF page
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current || currentPage > totalPages) return;

        const renderPage = async () => {
            try {
                setIsLoading(true);
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale: scale * 2 });

                const canvas = canvasRef.current!;
                const context = canvas.getContext('2d')!;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to render page:', error);
                setError('Failed to render page');
                setIsLoading(false);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale, rotation, totalPages]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!containerRef.current?.contains(document.activeElement)) return;

            switch (e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    handlePreviousPage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleNextPage();
                    break;
                case 'Equal':
                case 'NumpadAdd':
                    e.preventDefault();
                    zoomIn();
                    break;
                case 'Minus':
                case 'NumpadSubtract':
                    e.preventDefault();
                    zoomOut();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    rotate();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    setShowControls(!showControls);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [scale, currentPage, totalPages, showControls]);

    // Auto-hide controls
    useEffect(() => {
        if (!showControls) return;

        const timer = setTimeout(() => {
            setShowControls(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [showControls]);

    const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const rotate = () => setRotation(prev => (prev + 90) % 360);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const page = parseInt(e.target.value);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleDownload = () => {
        if (!source) return;

        const link = document.createElement('a');
        link.href = source;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (file.meta?.mimeType === 'application/pdf') {
            window.open(source, '_blank')?.print();
        } else {
            setIsPrintDialogOpen(true);
        }
    };

    const handleSearch = async () => {
        if (!pdfDoc || !searchQuery.trim()) return;

        try {
            const results: number[] = [];
            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map((item: any) => item.str).join(' ');

                if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
                    results.push(i);
                }
            }

            setSearchResults(results);
            if (results.length > 0) {
                setCurrentPage(results[0]);
                setCurrentSearchResult(0);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const navigateSearchResult = (direction: 'next' | 'prev') => {
        if (searchResults.length === 0) return;

        const currentIndex = searchResults.indexOf(currentPage);
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= searchResults.length) newIndex = 0;
        if (newIndex < 0) newIndex = searchResults.length - 1;

        setCurrentPage(searchResults[newIndex]);
        setCurrentSearchResult(newIndex);
    };

    // Fixed Tooltip wrapper for disabled buttons
    const TooltipButton = ({ title, disabled, onClick, children, ...props }: any) => (
        <Tooltip title={title}>
            <span> {/* Wrapper element to fix MUI warning */}
                <IconButton
                    disabled={disabled}
                    onClick={onClick}
                    {...props}
                >
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    );

    if (!supportedTypes.includes(file.meta?.mimeType || '')) {
        return (
            <Stack flex={1} alignItems="center" justifyContent="center" spacing={2}>
                <FileIcon size={64} />
                <Typography variant="h6">Unsupported document format</Typography>
                <Typography variant="body2" color="text.secondary">
                    This document type cannot be previewed. Please download the file to view it.
                </Typography>
                <Button
                    variant="contained"
                    onClick={handleDownload}
                    startIcon={<Download size={16} />}
                >
                    Download File
                </Button>
            </Stack>
        );
    }

    if (error) {
        return (
            <Stack flex={1} alignItems="center" justifyContent="center" spacing={2}>
                <FileText size={64} />
                <Typography variant="h6">Error loading document</Typography>
                <Typography variant="body2" color="error">
                    {error}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={handleDownload}
                    startIcon={<Download size={16} />}
                >
                    Download Instead
                </Button>
            </Stack>
        );
    }

    return (
        <Stack
            ref={containerRef}
            flex={1}
            width="100%"
            height="100%"
            position="relative"
            bgcolor="grey.100"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            sx={{ overflow: 'hidden' }}
        >
            {/* Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                    >
                        <Stack alignItems="center" spacing={2}>
                            <CircularProgress size={40} />
                            <Typography variant="body2" color="text.secondary">
                                Loading document...
                            </Typography>
                        </Stack>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Document Content */}
            <Stack
                flex={1}
                alignItems="center"
                justifyContent="center"
                sx={{ overflow: 'auto', p: 4 }}
            >
                {file.meta?.mimeType === 'application/pdf' ? (
                    <Box
                        sx={{
                            transform: `rotate(${rotation}deg)`,
                            transition: 'transform 0.3s ease',
                            boxShadow: theme => theme.shadows[4],
                            bgcolor: 'white'
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            style={{
                                display: 'block',
                                maxWidth: '100%',
                                height: 'auto'
                            }}
                        />
                    </Box>
                ) : (
                    <Paper
                        sx={{
                            p: 4,
                            maxWidth: '800px',
                            width: '100%',
                            bgcolor: 'white',
                            boxShadow: theme => theme.shadows[4]
                        }}
                    >
                        <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                            {file.meta?.mimeType?.startsWith('text/') ?
                                'Document content would be displayed here. For non-text files, please download to view.' :
                                'This document format requires download to view properly.'
                            }
                        </Typography>
                    </Paper>
                )}
            </Stack>

            {/* Controls Overlay */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            bottom: 20,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100
                        }}
                    >
                        <Paper
                            sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                boxShadow: theme => theme.shadows[8]
                            }}
                        >
                            {/* Navigation */}
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <TooltipButton
                                    title="Previous page (←)"
                                    onClick={handlePreviousPage}
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronLeft size={20} />
                                </TooltipButton>

                                <TextField
                                    size="small"
                                    type="number"
                                    value={currentPage}
                                    onChange={handlePageInput}
                                    inputProps={{
                                        min: 1,
                                        max: totalPages,
                                        style: { textAlign: 'center', width: 60 }
                                    }}
                                />
                                <Typography variant="body2" sx={{ minWidth: 40 }}>
                                    / {totalPages}
                                </Typography>

                                <TooltipButton
                                    title="Next page (→)"
                                    onClick={handleNextPage}
                                    disabled={currentPage >= totalPages}
                                >
                                    <ChevronRight size={20} />
                                </TooltipButton>
                            </Stack>

                            {/* Zoom Controls */}
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <TooltipButton
                                    title="Zoom out (-)"
                                    onClick={zoomOut}
                                    disabled={scale <= 0.5}
                                >
                                    <ZoomOut size={20} />
                                </TooltipButton>

                                <Typography variant="body2" sx={{ minWidth: 40 }}>
                                    {Math.round(scale * 100)}%
                                </Typography>

                                <TooltipButton
                                    title="Zoom in (+)"
                                    onClick={zoomIn}
                                    disabled={scale >= 3}
                                >
                                    <ZoomIn size={20} />
                                </TooltipButton>

                                <Slider
                                    value={scale}
                                    min={0.5}
                                    max={3}
                                    step={0.1}
                                    onChange={(_, value) => setScale(value as number)}
                                    sx={{ width: 100 }}
                                />
                            </Stack>

                            {/* Action Buttons */}
                            <Stack direction="row" spacing={1}>
                                <TooltipButton title="Rotate (R)" onClick={rotate}>
                                    <RotateCw size={20} />
                                </TooltipButton>

                                <TooltipButton title="Download" onClick={handleDownload}>
                                    <Download size={20} />
                                </TooltipButton>

                                <TooltipButton title="Print" onClick={handlePrint}>
                                    <Printer size={20} />
                                </TooltipButton>
                            </Stack>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar Info */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'absolute',
                            top: 20,
                            left: 20,
                            zIndex: 100
                        }}
                    >
                        <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FileText size={20} />
                            <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                {file.name}
                            </Typography>
                            <Chip
                                label={file.meta?.mimeType?.split('/')[1]?.toUpperCase() || 'DOC'}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Print Dialog */}
            <Dialog open={isPrintDialogOpen} onClose={() => setIsPrintDialogOpen(false)}>
                <DialogTitle>Print Document</DialogTitle>
                <DialogContent>
                    <Typography>
                        This document format cannot be printed directly from the browser.
                        Please download the file and open it in an appropriate application to print.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsPrintDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDownload} variant="contained" startIcon={<Download />}>
                        Download File
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default {
    priority: 5,
    id: 'document-viewer',
    name: "Document Viewer",
    icon: <FileText size={18} />,
    supports: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    component: DocumentViewerComponent
} as ViewerModule;