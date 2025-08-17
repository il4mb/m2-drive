"use client"

import { Button, Stack } from '@mui/material';
import { ReactNode } from 'react';
import { AuthButton } from "@il4mb/satupintu"
import { SatuPintu } from '@il4mb/satupintu/icons';

export interface pageProps {
    children?: ReactNode;
}
export default function page({ children }: pageProps) {
    return (
        <Stack flex={1} alignItems={"center"} justifyContent={"center"}>
            <AuthButton
                component={Button}
                startIcon={<SatuPintu />}
                variant='contained'
                size='large'>
                Masuk
            </AuthButton>
        </Stack>
    );
}