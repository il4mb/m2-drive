"use client"

import { CircularProgress, Stack, Typography } from '@mui/material';
import { ReactNode, use } from 'react';

export interface pageProps {
    children?: ReactNode;
    params: Promise<{ id: string }>;
}
export default function page({ params }: pageProps) {
    
    const { id } = use(params);
    
    return (
        <Stack flex={1} alignItems={"center"} justifyContent={"center"}>
            <Typography>
                {id}
            </Typography>
            <CircularProgress />
        </Stack>
    );
}