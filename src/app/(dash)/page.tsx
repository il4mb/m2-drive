"use client"

import ActivitiesCard from '@/components/activities/ActivitiesCard';
import DriveSummary from '@/components/analistic/DriveSummary';
import Container from '@/components/Container';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import OnlineUsers from '@/components/OnlineUsers';
import { Paper, Stack, Typography } from '@mui/material';

export default function page() {

    const session = useCurrentSession();

    return (
        <Container maxWidth={'xl'} scrollable>
            <Stack component={Paper} p={4} sx={{ boxShadow: 2, borderRadius: 2, mb: 4 }}>
                <Typography fontSize={26} fontWeight={600} mb={3}>
                    Selamat Datang di <strong>M2</strong> Drive
                </Typography>
                <OnlineUsers />
            </Stack>

            <Stack direction={['column', 'column', 'column', 'row-reverse']} alignItems={'flex-start'} gap={3}>
                <ActivitiesCard sx={{ boxShadow: 2, width: '100%', flexBasis: { lg: 300 } }} />
                <Stack flex={1} component={Paper} p={4} sx={{ boxShadow: 2, borderRadius: 2, width: '100%', flexBasis: { lg: 800 } }}>
                    <Typography mb={2} fontSize={26}>
                        Statistik Drive Saya
                    </Typography>
                    <DriveSummary user={session?.user || undefined} />
                </Stack>
            </Stack>
        </Container>
    );
}