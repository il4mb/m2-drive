"use client"

import { Alert, AlertTitle, Button, SxProps } from '@mui/material';
import useRequest from './hooks/useRequest';

export interface RequestErrorProps {
    request: ReturnType<typeof useRequest<any, any, any>>;
    closable?: boolean;
    tryagain?: boolean;
    sx?: SxProps;
}
export default function RequestError({ request, closable: closeable = false, tryagain = false, sx = {} }: RequestErrorProps) {
    const error = request.error;
    const handleClose = () => {
        if (closeable) request.clearError();
    }

    if (!error) return null;
    return (
        <Alert severity='error' {...(closeable && { onClose: handleClose })} sx={sx}>
            <AlertTitle>{error.type}</AlertTitle>
            {error.message}
            {tryagain && (
                <Button size='small' onClick={() => request.send()}>Try again</Button>
            )}
        </Alert>
    );
}