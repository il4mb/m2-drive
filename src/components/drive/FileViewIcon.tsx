import { File } from '@/entities/File';
import { Folder } from 'lucide-react';
import { FileIcon } from '@untitledui/file-icons';
import { usePresignUrlWith } from '@/hooks/usePresignUrl';
import { Box, Stack } from '@mui/material';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export interface FileIconProps {
    file: File;
    size?: number;
    showDocumentPreview?: boolean;
}

// MIME type to FileIcon type mapping
const mimeTypeToIconType = (mimeType: string): string => {
    const mimeMap: Record<string, string> = {
        // Audio files
        'audio/': 'audio',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'audio',

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

        // Document files
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'application/rtf': 'doc',

        // Spreadsheet files
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'text/csv': 'csv',

        // Image files
        'image/': 'image',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'image/tiff': 'tiff',
        'image/webp': 'webp',

        // Video files
        'video/': 'video',
        'video/mp4': 'mp4',
        'video/mpeg': 'mpeg',
        'video/avi': 'avi',
        'video/x-msvideo': 'avi',
        'video/x-matroska': 'mkv',
        'video/quicktime': 'video-01',

        // Archive files
        'application/zip': 'zip',
        'application/x-rar-compressed': 'rar',
        'application/x-7z-compressed': 'zip',
        'application/x-tar': 'zip',
        'application/gzip': 'zip',

        // Application files
        'application/x-msdownload': 'exe',
        'application/x-apple-diskimage': 'dmg',
        'application/octet-stream': 'bin',

        // Design files
        'application/postscript': 'eps',
        'application/illustrator': 'ai',
        'image/vnd.adobe.photoshop': 'psd',
        'application/x-indesign': 'indd',
        'application/fig': 'fig',
        'application/aep': 'aep',
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

// Validate that the resolved type is supported by FileIcon
const getValidIconType = (type: string): string => {
    const supportedTypes = [
        "audio", "code", "document", "empty", "folder", "image", "img",
        "spreadsheets", "video", "video-01", "video-02", "aep", "ai",
        "avi", "css", "csv", "dmg", "doc", "docx", "eps", "exe", "fig",
        "gif", "html", "indd", "java", "jpeg", "jpg", "js", "json", "mkv",
        "mp3", "mp4", "mpeg", "pdf", "pdf-simple", "png", "ppt", "pptx",
        "psd", "rar", "rss", "sql", "svg", "tiff", "txt", "wav", "webp",
        "xls", "xlsx", "xml", "zip"
    ];

    return supportedTypes.includes(type) ? type : 'empty';
};

export default function FileViewIcon({ file, size = 18, showDocumentPreview = false }: FileIconProps) {

    const pdfPresign = usePresignUrlWith({ fileId: file.id, metaKey: 'pdfObjectKey' });

    if (pdfPresign && showDocumentPreview) {
        return <ContentIcon url={pdfPresign} file={file} />
    }

    if (file.type === "folder") {
        return <Folder size={size} />;
    }

    // @ts-ignore - handle cases where meta might not exist
    const mimeType = file.meta?.mimeType || "application/octet-stream";
    const resolvedType = mimeTypeToIconType(mimeType);
    const validType = getValidIconType(resolvedType);

    return (
        <FileIcon
            size={size}
            type={validType}
            variant={"solid"}
        />
    );
}

const ContentIcon = ({ url, file }: { url: string; file: File }) => {

    // @ts-ignore
    const mimeType = file.meta?.mimeType || "application/octet-stream";
    const resolvedType = mimeTypeToIconType(mimeType);
    const validType = getValidIconType(resolvedType);

    return (
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.7
            }}>
            <Box sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 10
            }}>
                <FileIcon
                    size={18}
                    type={validType}
                    variant={"solid"}
                />
            </Box>
            <Document key={file.id} file={url} loading={null} error={"Failed load preview"}>
                <Page pageNumber={1} width={200} />
            </Document>
        </Box>
    );
}


// Optional: Utility function to get icon type from MIME type
export const getFileIconType = (mimeType: string): string => {
    const resolvedType = mimeTypeToIconType(mimeType);
    return getValidIconType(resolvedType);
}