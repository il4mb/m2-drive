"use client"

import DriveSummary from '@/components/analistic/DriveSummary';
import Container from '@/components/Container';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import OnlineUsers from '@/components/OnlineUsers';
import { useUserDriveSummary } from '@/hooks/useDrive';
import { useDriveUssageSummary } from '@/hooks/useDriveSummry';
import { Query } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { Paper, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';

export default function page() {

    const { user } = useCurrentSession();


    return (
        <Container maxWidth='lg' scrollable>
            <Stack component={Paper} p={4} borderRadius={2}>
                <Typography fontSize={26} fontWeight={600} mb={3}>
                    Selamat Datang di <strong>M2</strong> Drive
                </Typography>
                <OnlineUsers />
            </Stack>

            <Stack component={Paper} p={4} borderRadius={2} mt={4}>
                <Typography mb={2} fontSize={26}>
                    Statistik Drive Saya
                </Typography>
                <DriveSummary user={user || undefined} />
            </Stack>

        </Container>
    );
}