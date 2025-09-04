import { formatFileSize } from '@/libs/utils';
import { Avatar, Paper, Stack, Typography } from '@mui/material';
import UploadViewAction from './UploadViewAction';
import { FileUpload } from '@/types';
import { useMemo, useState } from 'react';
import UploadViewProgress from './UploadViewProgress';
import { FileIcon } from '@untitledui/file-icons';
import { useUploads } from '@/components/context/UploadsProvider';

export interface UploadViewProps {
    upload: FileUpload;
}

export default function UploadView({ upload }: UploadViewProps) {
    const { updateUpload, retryUpload, cancelUpload, removeUpload } = useUploads();
    const [loading, setLoading] = useState({
        start: false,
        pause: false,
        stop: false,
        delete: false
    });

    const status = useMemo(() => upload.status, [upload]);
    const progress = useMemo(() => upload.progress || 0, [upload]);
    const thumbnail = useMemo(() => {
        if (upload.thumbnail && upload.thumbnail instanceof ArrayBuffer) {
            return URL.createObjectURL(new Blob([new Uint8Array(upload.thumbnail)], { type: 'image/png' }));
        }
        return undefined;
    }, [upload])

    const handleAction = async (actionType: keyof typeof loading, action: () => Promise<void>) => {
        if (Object.values(loading).some(val => val)) return;

        setLoading(prev => ({ ...prev, [actionType]: true }));
        try {
            await action();
        } catch (error) {
            console.error(`Error during ${actionType}:`, error);
        } finally {
            setLoading(prev => ({ ...prev, [actionType]: false }));
        }
    };

    const onStart = () => handleAction('start', () => retryUpload(upload.id));
    const onPause = () => handleAction('pause', () => cancelUpload(upload.id));
    const onStop = () => handleAction('stop', () => cancelUpload(upload.id));
    const onDelete = () => handleAction('delete', () => removeUpload(upload.id));

    return (
        <Stack component={Paper} elevation={1} sx={{ boxShadow: '0 0 1px #0004, 0 0 4px #0002' }} py={1.5} px={2}>
            <Stack direction={"row"} spacing={1.5}>
                <Avatar src={thumbnail} variant='rounded'>
                    <FileIcon
                        variant='solid'
                        size={22}
                        type={upload.fileType} />
                </Avatar>
                <Stack flex={1}>
                    <Stack direction={"row"} mb={0.5}>
                        <Stack flex={1}>
                            <Typography variant="body2" fontWeight={500}>
                                {upload.fileName}
                            </Typography>
                            <Stack direction={"row"} alignItems={"center"} spacing={0.5}>
                                <Typography
                                    fontSize={10}
                                    textTransform={"uppercase"}
                                    color={
                                        status === 'error' ? 'error.main' :
                                            status === 'done' ? 'success.main' :
                                                'text.secondary'
                                    }>
                                    {status}
                                </Typography>
                                <Typography color='text.secondary' fontSize={10}>
                                    - {formatFileSize(upload.fileSize)}
                                </Typography>
                            </Stack>
                        </Stack>
                        <UploadViewAction
                            loading={loading}
                            onStart={onStart}
                            onPause={onPause}
                            onStop={onStop}
                            onDelete={onDelete}
                            status={status} />
                    </Stack>

                    {status == "error" && upload.error && (
                        <Typography variant="caption" color='error.main' mt={0.5}>
                            <strong>Error: </strong>
                            {upload.error}
                        </Typography>
                    )}

                    <UploadViewProgress
                        progress={progress}
                        status={status} />
                </Stack>
            </Stack>
        </Stack>
    );
}