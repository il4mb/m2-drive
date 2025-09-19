import { File } from '@/entities/File';
import { Folder } from 'lucide-react';
import { FileIcon } from '@untitledui/file-icons';
import { usePresignUrlWith } from '@/hooks/usePresignUrl';
import { Box, CircularProgress, Stack } from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useState, useMemo, useCallback } from 'react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { usePdfWorkerReady } from '@/viewer/modules/DocumentViewer';

// PDF worker initialization with error handling
try {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
} catch (error) {
    console.warn('PDF worker initialization failed:', error);
}

export interface FileIconProps {
    file: File;
    size?: number;
    showDocumentPreview?: boolean;
}

// MIME type to FileIcon type mapping with proper typing
interface MimeTypeMap {
    [key: string]: string;
}

const mimeTypeToIconType = (mimeType: string): string => {
    const mimeMap: MimeTypeMap = {
        // Audio files
        'audio/': 'audio',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'audio',
        'audio/aac': 'audio',
        'audio/x-m4a': 'audio',

        // Code files
        'text/': 'code',
        'application/javascript': 'js',
        'application/json': 'json',
        'application/xml': 'xml',
        'text/css': 'css',
        'text/html': 'html',
        'text/x-python': 'code',
        'text/x-java': 'java',
        'application/sql': 'sql',
        'text/typescript': 'code',
        'text/x-c': 'code',
        'text/x-c++': 'code',
        'text/x-csharp': 'code',

        // Document files
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'application/rtf': 'doc',
        'application/vnd.oasis.opendocument.text': 'doc',

        // Spreadsheet files
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'text/csv': 'csv',
        'application/vnd.oasis.opendocument.spreadsheet': 'xls',

        // Image files
        'image/': 'image',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'image/tiff': 'tiff',
        'image/webp': 'webp',
        'image/bmp': 'image',
        'image/x-icon': 'image',

        // Video files
        'video/': 'video',
        'video/mp4': 'mp4',
        'video/mpeg': 'mpeg',
        'video/avi': 'avi',
        'video/x-msvideo': 'avi',
        'video/x-matroska': 'mkv',
        'video/quicktime': 'video-01',
        'video/x-ms-wmv': 'video',
        'video/webm': 'video',

        // Archive files
        'application/zip': 'zip',
        'application/x-rar-compressed': 'rar',
        'application/x-7z-compressed': 'zip',
        'application/x-tar': 'zip',
        'application/gzip': 'zip',
        'application/x-bzip2': 'zip',

        // Application files
        'application/x-msdownload': 'exe',
        'application/x-apple-diskimage': 'dmg',
        'application/octet-stream': 'bin',
        'application/x-sh': 'code',
        'application/x-msdos-program': 'exe',

        // Design files
        'application/postscript': 'eps',
        'application/illustrator': 'ai',
        'image/vnd.adobe.photoshop': 'psd',
        'application/x-indesign': 'indd',
        'application/fig': 'fig',
        'application/aep': 'aep',
        'application/x-sketch': 'fig',
    };

    // Exact match first
    if (mimeMap[mimeType]) {
        return mimeMap[mimeType];
    }

    // Partial match (prefix)
    for (const [key, value] of Object.entries(mimeMap)) {
        if (key.endsWith('/') && mimeType.startsWith(key)) {
            return value;
        }
    }

    // Default fallbacks based on category
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/')) return 'txt';

    return 'empty';
};

// Supported types array as const for type safety
const SUPPORTED_ICON_TYPES = [
    "audio", "code", "document", "empty", "folder", "image", "img",
    "spreadsheets", "video", "video-01", "video-02", "aep", "ai",
    "avi", "css", "csv", "dmg", "doc", "docx", "eps", "exe", "fig",
    "gif", "html", "indd", "java", "jpeg", "jpg", "js", "json", "mkv",
    "mp3", "mp4", "mpeg", "pdf", "pdf-simple", "png", "ppt", "pptx",
    "psd", "rar", "rss", "sql", "svg", "tiff", "txt", "wav", "webp",
    "xls", "xlsx", "xml", "zip"
] as const;

type SupportedIconType = typeof SUPPORTED_ICON_TYPES[number];

const getValidIconType = (type: string): SupportedIconType => {
    return SUPPORTED_ICON_TYPES.includes(type as SupportedIconType)
        ? (type as SupportedIconType)
        : 'empty';
};

interface ContentIconProps {
    url: string;
    file: File;
}

const ContentIcon = ({ url, file }: ContentIconProps) => {
    const [pdfError, setPdfError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isPdfWorkerReady = usePdfWorkerReady();

    // @ts-ignore
    const mimeType = file.meta?.mimeType || "application/octet-stream";
    const validType = useMemo(() => {
        const resolvedType = mimeTypeToIconType(mimeType);
        return getValidIconType(resolvedType);
    }, [mimeType]);

    const handlePdfLoadError = useCallback((error: Error) => {
        console.error('PDF loading failed:', error);
        setPdfError(true);
        setIsLoading(false);
    }, []);

    const handlePdfLoadSuccess = useCallback(() => {
        setIsLoading(false);
    }, []);

    // Fallback to regular icon if PDF fails to load or worker isn't ready
    if (pdfError || !isPdfWorkerReady) {
        return (
            <FileIcon
                size={18}
                type={validType}
                variant="solid"
            />
        );
    }

    return (
        <Box
            sx={{
                position: 'absolute',
                paddingBottom: '110%',
                top: 0,
                left: 0,
                width: '100%',
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1,
                opacity: 0.7
            }}>
            {/* Loading overlay */}
            {isLoading && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        zIndex: 1,
                    }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {/* File type indicator */}
            <Stack
                justifyContent={"center"}
                alignItems={"center"}
                sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 100,
                    backgroundColor: 'background.paper',
                    borderRadius: '50%',
                    padding: 0.5,
                    boxShadow: 1,
                    width: 26,
                    height: 26
                }}>
                <FileIcon
                    size={16}
                    type={validType}
                    variant="solid"
                />
            </Stack>

            {/* PDF document */}
            <Document
                file={url}
                loading={null}
                error={null}
                onLoadError={handlePdfLoadError}
                onLoadSuccess={handlePdfLoadSuccess}
                className="pdf-document">
                <Page
                    pageNumber={1}
                    width={200}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                />
            </Document>
        </Box>
    );
};

export default function FileViewIcon({
    file,
    size = 18,
    showDocumentPreview = false
}: FileIconProps) {
    const pdfPresign = usePresignUrlWith({
        fileId: file.id,
        // @ts-ignore
        metaKey: file.meta?.mimeType === "application/pdf" ? "Key" : 'pdfObjectKey'
    });

    const validType = useMemo(() => {
        if (file.type === "folder") return 'folder';
        // @ts-ignore
        const mimeType = file.meta?.mimeType || "application/octet-stream";
        const resolvedType = mimeTypeToIconType(mimeType);
        return getValidIconType(resolvedType);
    }, [file]);

    // Show PDF preview if conditions are met
    const shouldShowPdfPreview = useMemo(() => {
        return Boolean(
            pdfPresign &&
            showDocumentPreview
        );
        // @ts-ignore
    }, [pdfPresign, showDocumentPreview, file.meta?.mimeType]);

    if (shouldShowPdfPreview && pdfPresign) {
        return <ContentIcon url={pdfPresign} file={file} />;
    }

    if (file.type === "folder") {
        return <Folder size={size} />;
    }

    return (
        <FileIcon
            size={size}
            type={validType}
            variant="solid"
        />
    );
}

// Utility function with proper typing
export const getFileIconType = (mimeType: string): SupportedIconType => {
    const resolvedType = mimeTypeToIconType(mimeType);
    return getValidIconType(resolvedType);
};