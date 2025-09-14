"use client"

import ActivitiesCard from '@/components/activities/ActivitiesCard';
import ActivitySummary from '@/components/analistic/ActivitiesSummary';
import DriveSummary from '@/components/analistic/DriveSummary';
import Container from '@/components/Container';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import OnlineUsers from '@/components/OnlineUsers';
import { useMyPermission } from '@/hooks/useMyPermission';
import { Button, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function page() {

    const session = useCurrentSession();
    const ableToSeeActivityReport = useMyPermission("can-access-activity-report");

    return (
        <Container maxWidth={'xl'} scrollable>
            <Stack component={Paper} p={4} sx={{ boxShadow: 2, borderRadius: 2, mb: 4 }}>
                <Stack mb={2}>
                    <Typography fontSize={26} fontWeight={800} mb={2}>
                        Selamat Datang di <strong>M2</strong> Drive
                    </Typography>
                    <OnlineUsers />
                </Stack>

                {ableToSeeActivityReport && (
                    <>
                        <ActivitySummary />
                        <Button sx={{ alignSelf: 'end', justifySelf: 'end' }} LinkComponent={Link} href='/activities-report'>
                            Lihat Selengkapnya
                        </Button>
                    </>
                )}
            </Stack>

            <Stack direction={['column', 'column', 'column', 'row-reverse']} alignItems={'flex-start'} gap={3}>
                <ActivitiesCard sx={{ boxShadow: 2, width: '100%', flexBasis: { lg: 400 } }} />
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