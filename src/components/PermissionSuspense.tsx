'use client'

import { useMyPermission } from '@/hooks/useMyPermission';
import { PERMISSION_NAMES } from '@/permission';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Home, Key } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

export interface PermissionSuspenseProps {
    children?: ReactNode;
    permission: PERMISSION_NAMES | PERMISSION_NAMES[];
    fallback?: ReactNode;
    message?: string;
    redirect?: string;
}
export default function PermissionSuspense({ children, permission, redirect, fallback, message }: PermissionSuspenseProps) {

    const router = useRouter();
    const allowed = useMyPermission(permission);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 200);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (redirect && !allowed) {
            router.push(redirect);
        }
    }, [mounted, redirect, allowed]);

    if (!mounted) return null;

    return (
        <>
            {allowed ? children : fallback ? fallback : (
                <Stack flex={1} justifyContent={"center"} alignItems={"center"}>
                    <Box textAlign={"center"} color={"warning.main"} component={Paper} p={3}>
                        <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"center"} mb={1}>
                            <Key strokeWidth={3} size={18} />
                            <Typography fontSize={18} fontWeight={800}>Permission not Granted</Typography>
                        </Stack>
                        <Typography>
                            {message || "Kamu tidak memiliki izin untuk melihat halaman ini!"}
                        </Typography>
                        <Button
                            LinkComponent={Link}
                            href='/'
                            startIcon={<Home size={16} />}
                            variant='contained'
                            size='small'
                            sx={{ px: 3, mt: 3 }}>Kembali</Button>
                    </Box>
                </Stack>
            )}
        </>
    );
}