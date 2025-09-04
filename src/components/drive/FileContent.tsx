'use client'

import { File } from '@/entity/File';
import usePresignUrl from '@/hooks/usePresignUrl';
import { Box, Stack, Typography, Button, Menu, MenuItem, IconButton, Chip } from '@mui/material';
import { ReactNode, useState } from 'react';
import { Download, FileText, FileVideo, FileAudio, FileImage, FileArchive, FileCode, File as FileIcon, MoreVertical, ExternalLink } from 'lucide-react';

export interface FileContentProps {
    children?: ReactNode;
    file: File<'file'>;
}

export default function FileContent({ children, file }: FileContentProps) {
    const source = usePresignUrl(file.meta?.Key);
    const [pdfError, setPdfError] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const fileName = file.name || 'file';
    const fileSize = file.meta?.size ? formatFileSize(file.meta.size) : 'Unknown size';
    
    const open = Boolean(anchorEl);

    // Format file size function
    function formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get file icon based on MIME type
    const getFileIcon = () => {
        const mime = file.meta?.mimeType || '';
        
        if (mime.startsWith('image/')) return <FileImage size={48} />;
        if (mime.startsWith('video/')) return <FileVideo size={48} />;
        if (mime.startsWith('audio/')) return <FileAudio size={48} />;
        if (mime === 'application/pdf') return <FileText size={48} />;
        if (mime.includes('zip') || mime.includes('compressed')) return <FileArchive size={48} />;
        if (mime.includes('text') || mime.includes('code')) return <FileCode size={48} />;
        
        return <FileIcon size={48} />;
    };

    // Handle download
    const handleDownload = () => {
        if (source) {
            const link = document.createElement('a');
            link.href = source;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Handle open with menu
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Open in new tab
    const handleOpenInNewTab = () => {
        if (source) {
            window.open(source, '_blank');
        }
        handleMenuClose();
    };

    // Open with specific application based on file type
    const getOpenWithOptions = () => {
        const mime = file.meta?.mimeType || '';
        const options = [];

        // Always include browser options
        options.push(
            <MenuItem key="browser" onClick={handleOpenInNewTab}>
                <ExternalLink size={16} style={{ marginRight: 8 }} />
                Open in Browser
            </MenuItem>
        );

        // File type specific options
        if (mime.startsWith('image/')) {
            options.push(
                <MenuItem key="image-editor" onClick={() => window.open(`https://www.photopea.com/#${source}`, '_blank')}>
                    <FileImage size={16} style={{ marginRight: 8 }} />
                    Open in Photopea (Online Editor)
                </MenuItem>
            );
        }

        if (mime === 'application/pdf') {
            options.push(
                <MenuItem key="google-docs" onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(source || '')}`, '_blank')}>
                    <FileText size={16} style={{ marginRight: 8 }} />
                    Open in Google Docs Viewer
                </MenuItem>
            );
        }

        if (mime.startsWith('text/') || mime.includes('code')) {
            options.push(
                <MenuItem key="vscode" onClick={() => window.open(`vscode://file/${fileName}?${source}`, '_blank')}>
                    <FileCode size={16} style={{ marginRight: 8 }} />
                    Open in VS Code (if installed)
                </MenuItem>
            );
        }

        if (mime.includes('spreadsheet') || mime.includes('excel')) {
            options.push(
                <MenuItem key="google-sheets" onClick={() => window.open(`https://docs.google.com/spreadsheets/create?url=${encodeURIComponent(source || '')}`, '_blank')}>
                    <FileText size={16} style={{ marginRight: 8 }} />
                    Open in Google Sheets
                </MenuItem>
            );
        }

        if (mime.includes('word') || mime.includes('document')) {
            options.push(
                <MenuItem key="google-docs" onClick={() => window.open(`https://docs.google.com/document/create?url=${encodeURIComponent(source || '')}`, '_blank')}>
                    <FileText size={16} style={{ marginRight: 8 }} />
                    Open in Google Docs
                </MenuItem>
            );
        }

        return options;
    };

    // Header with file info and actions
    const renderFileHeader = () => (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack>
                <Typography variant="h6" noWrap sx={{ maxWidth: '300px' }}>
                    {fileName}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip 
                        label={file.meta?.mimeType || 'Unknown type'} 
                        size="small" 
                        variant="outlined" 
                    />
                    <Typography variant="caption" color="text.secondary">
                        {fileSize}
                    </Typography>
                </Stack>
            </Stack>
            
            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    startIcon={<Download size={16} />}
                    onClick={handleDownload}
                    size="small">
                    Download
                </Button>
                
                <IconButton
                    size="small"
                    onClick={handleMenuOpen}
                    sx={{ border: 1, borderColor: 'divider' }}>
                    <MoreVertical size={16} />
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleMenuClose}
                    PaperProps={{
                        sx: { minWidth: 200 }
                    }}>
                    {getOpenWithOptions()}
                </Menu>
            </Stack>
        </Stack>
    );

    // Image files
    if (file.meta?.mimeType?.startsWith("image/")) {
        return (
            <Stack sx={{ height: '100%' }}>
                {renderFileHeader()}
                <Box
                    flex={1}
                    component={"img"}
                    src={source}
                    alt={fileName}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        maxHeight: 'min(85vh, 850px)',
                        borderRadius: 1,
                        p: 2
                    }} 
                />
            </Stack>
        );
    }

    // PDF files
    if (file.meta?.mimeType === 'application/pdf') {
        if (pdfError) {
            return (
                <Stack sx={{ height: '100%' }}>
                    {renderFileHeader()}
                    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, flex: 1 }}>
                        <FileText size={64} />
                        <Typography variant="h6">PDF Preview Unavailable</Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Unable to display PDF preview. You can open it in another application.
                        </Typography>
                    </Stack>
                </Stack>
            );
        }

        return (
            <Stack sx={{ height: '100%' }}>
                {renderFileHeader()}
                <Box sx={{ width: '100%', height: '100%', minHeight: '500px', flex: 1 }}>
                    <iframe
                        src={source}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title={fileName}
                        onError={() => setPdfError(true)}
                    />
                </Box>
            </Stack>
        );
    }

    // Video files
    if (file.meta?.mimeType?.startsWith("video/")) {
        return (
            <Stack sx={{ height: '100%' }}>
                {renderFileHeader()}
                <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', p: 2, flex: 1 }}>
                    <video
                        controls
                        style={{
                            width: '100%',
                            height: '100%',
                            maxHeight: '70vh',
                            borderRadius: '8px',
                            backgroundColor: '#000'
                        }}
                    >
                        <source src={source} type={file.meta.mimeType} />
                        Your browser does not support the video tag.
                    </video>
                </Box>
            </Stack>
        );
    }

    // Audio files
    if (file.meta?.mimeType?.startsWith("audio/")) {
        return (
            <Stack sx={{ height: '100%' }}>
                {renderFileHeader()}
                <Stack alignItems="center" spacing={2} sx={{ p: 4, flex: 1, justifyContent: 'center' }}>
                    <FileAudio size={64} />
                    <audio
                        controls
                        style={{ width: '100%', maxWidth: '400px' }}>
                        <source src={source} type={file.meta.mimeType} />
                        Your browser does not support the audio element.
                    </audio>
                </Stack>
            </Stack>
        );
    }

    // Default fallback for other files
    return (
        <Stack sx={{ height: '100%' }}>
            {renderFileHeader()}
            <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, flex: 1 }}>
                {getFileIcon()}
                <Typography variant="h6">{fileName}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {fileSize} • {file.meta?.mimeType || 'Unknown file type'}
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                    Preview not available for this file type. Use "Open with" to view in other applications.
                </Typography>
            </Stack>
        </Stack>
    );
}