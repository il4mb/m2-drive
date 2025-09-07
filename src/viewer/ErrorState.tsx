import { Stack, Typography, Button } from '@mui/material';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { File } from '@/entity/File';

interface ErrorStateProps {
    error?: string;
    onRefresh: () => void;
    file?: File | null;
}

export function ErrorState({ error, onRefresh, file }: ErrorStateProps) {
    const handleDownload = () => {
        if (file) {
            const downloadUrl = `/api/files/${file.id}/download`;
            window.open(downloadUrl, '_blank');
        }
    };

    return (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
            <AlertCircle size={48} color="#f44336" />
            <Typography variant="h6" color="error.main">
                Failed to Load File
            </Typography>
            <Typography color="text.secondary" textAlign="center">
                {error || 'An unexpected error occurred while loading the file.'}
            </Typography>
            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={onRefresh}>
                    Retry
                </Button>
                {file && (
                    <Button
                        variant="contained"
                        startIcon={<Download size={16} />}
                        onClick={handleDownload}>
                        Download
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}