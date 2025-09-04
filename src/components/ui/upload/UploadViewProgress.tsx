import { FileUpload } from '@/types';
import { LinearProgress, Stack, Typography } from '@mui/material';
import { ReactNode, useMemo } from 'react';

export interface UploadViewProgressProps {
    children?: ReactNode;
    progress?: number;
    status?: FileUpload['status'];
}
export default function UploadViewProgress({ progress = 0, status }: UploadViewProgressProps) {

    const color = useMemo(() =>
        status == "error"
            ? "error" : status == "uploading"
                ? "primary" : status == "done"
                    ? "success" : status == "pause"
                        ? "warning" : "secondary",
        [status]);

    return (
        <Stack direction={"row"} alignItems={"center"} gap={1}>
            <LinearProgress color={color} variant="determinate" value={progress} sx={{ height: 4, flex: 1 }} />
            <Typography color={color} fontSize={14} fontWeight={600}>
                {progress}%
            </Typography>
        </Stack>
    );
}