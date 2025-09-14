import { FileUpload } from '@/types';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { LoaderCircle, Pause, Play, Square, Trash } from 'lucide-react';

export interface UploadViewActionProps {
    disabled?: boolean;
    loading?: {
        start?: boolean;
        pause?: boolean;
        stop?: boolean;
        delete?: boolean;
    };
    status?: FileUpload['status'];
    onStart?: () => void;
    onPause?: () => void;
    onDelete?: () => void;
    onStop?: () => void;
}

export default function UploadViewAction({ 
    disabled = false, 
    loading = {}, 
    status = "pending", 
    onStart, 
    onPause, 
    onDelete, 
    onStop 
}: UploadViewActionProps) {
    
    const isLoading = Object.values(loading).some(val => val === true);
    
    return (
        <Stack direction={"row"} alignItems={"center"} spacing={0.5}>
            {["done", "error", "stop", "pause"].includes(status) && (
                <Tooltip title="Remove Upload" arrow>
                    <IconButton 
                        disabled={disabled || isLoading || loading.delete} 
                        color='error' 
                        onClick={onDelete}>
                        {loading.delete ? <LoaderCircle size={14} className='animate-spin' /> : <Trash size={14} />}
                    </IconButton>
                </Tooltip>
            )}
            
            {["pending", "error", "pause", "stop"].includes(status) && (
                <Tooltip title="Start Upload" arrow>
                    <IconButton 
                        disabled={disabled || isLoading || loading.start} 
                        color='primary' 
                        onClick={onStart}>
                        {loading.start ? <LoaderCircle size={14} className='animate-spin' /> : <Play size={14} />}
                    </IconButton>
                </Tooltip>
            )}
            
            {status == "uploading" && (
                <>
                    <Tooltip title="Pause Upload" arrow>
                        <IconButton 
                            disabled={disabled || isLoading || loading.pause} 
                            color='warning' 
                            onClick={onPause}>
                            {loading.pause ? <LoaderCircle size={14} className='animate-spin' /> : <Pause size={14} />}
                        </IconButton>
                    </Tooltip>
                </>
            )}
            
            {status == "finishing" && (
                <Typography fontSize={12} color="text.secondary">
                    Finishing...
                </Typography>
            )}
        </Stack>
    );
}