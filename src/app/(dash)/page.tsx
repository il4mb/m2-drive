"use client"

import DriveSummary from '@/components/analistic/DriveSummary';
import Container from '@/components/Container';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import OnlineUsers from '@/components/OnlineUsers';
import { Paper, Stack, Typography } from '@mui/material';

export default function page() {

    const session = useCurrentSession();

    return (
        <Container maxWidth='lg' scrollable>
            <Stack component={Paper} p={4} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Typography fontSize={26} fontWeight={600} mb={3}>
                    Selamat Datang di <strong>M2</strong> Drive
                </Typography>
                <OnlineUsers />
            </Stack>

            <Stack component={Paper} p={4} mt={4} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Typography mb={2} fontSize={26}>
                    Statistik Drive Saya
                </Typography>
                <DriveSummary user={session?.user || undefined} />
            </Stack>

        </Container>
    );
}