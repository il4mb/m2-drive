'use client'

import ActivitiesCard from '@/components/activities/ActivitiesCard';
import DriveSummary from '@/components/analistic/DriveSummary';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';
import useUser from '@/hooks/useUser';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { Pen } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function page() {

    const action = useActionsProvider();
    const { uid } = useParams<{ uid: string }>();
    const { user } = useUser(uid);

    useEffect(() => {
        return action.addAction("edit", {
            component: () => (
                <Button
                    component={Link}
                    href={`/users/${uid}/edit`}
                    startIcon={<Pen size={18} />}>
                    Sunting
                </Button>
            )
        })
    }, [uid]);

    return (
        <Stack direction={"row-reverse"} spacing={3} alignItems={"flex-start"}>
            <Stack
                flex={1}
                component={Paper}
                p={4}
                mb={4}
                borderRadius={2}
                sx={{
                    width: '100%',
                    maxWidth: 1200,
                    flexBasis: 900,
                    mx: 'auto',
                    boxShadow: 2
                }}>
                <Typography mb={2} fontSize={26}>
                    Statistik Drive <strong>{user?.name}</strong>
                </Typography>
                <DriveSummary user={user || undefined} />
            </Stack>
            <ActivitiesCard userId={uid} sx={{ boxShadow: 2, flexBasis: 300 }} />
        </Stack>
    );
}