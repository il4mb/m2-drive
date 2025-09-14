import { Stack, Typography, Button } from '@mui/material';
import { AlertCircle, RefreshCw, Download, FileLock2, FileWarning } from 'lucide-react';
import { File } from '@/entities/File';

interface ErrorStateProps {
    error?: string;
    onRefresh: () => void;
    file?: File | null;
}


export function ErrorState({ error, onRefresh, file }: ErrorStateProps) {

    const shouldShowRetry = !error?.toLowerCase().includes("denied");
    const getIcon = () => {
        if (error?.toLowerCase().includes("denied")) {
            return <FileLock2 size={48} color="#f44336" />
        }
        if (error?.toLowerCase().includes("not found")) {
            return <FileWarning size={48} color="#834949ff" />
        }
        return <AlertCircle size={48} color="#f44336" />
    }

    const getMessage = () => {
        if (error?.toLowerCase().includes("denied")) {
            return "Tidak di izinkan mengakses file ini!";
        }
        if (error?.toLowerCase().includes("not found")) {
            return "File tidak ditemukan atau telah dihapus!";
        }
        return error;
    }

    return (
        <Stack flex={1} alignItems="center" justifyContent="center" spacing={2} sx={{ p: 4, minHeight: 400 }}>
            {getIcon()}
            <Typography variant="h6" color="error.main">
                Failed to Load File
            </Typography>
            <Typography color="text.secondary" textAlign="center">
                {getMessage() || 'An unexpected error occurred while loading the file.'}
            </Typography>
            <Stack direction="row" spacing={1}>
                {shouldShowRetry && (
                    <Button
                        variant="outlined"
                        startIcon={<RefreshCw size={16} />}
                        onClick={onRefresh}>
                        Retry
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}