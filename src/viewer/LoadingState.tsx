import { Stack, Typography, CircularProgress } from '@mui/material';

export function LoadingState() {
    return (
        <Stack flex={1} justifyContent="center" alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
                Loading file information...
            </Typography>
        </Stack>
    );
}