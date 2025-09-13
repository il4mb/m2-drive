'use client'

import Container from '@/components/Container';
import useUser from '@/hooks/useUser';
import { Stack, Typography, Button } from '@mui/material';
import { Pen } from 'lucide-react';
import { useParams } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import StickyHeader from '@/components/navigation/StickyHeader';
import Link from 'next/link';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';
import UserAvatar from '@/components/ui/UserAvatar';

export interface layoutProps {
    children?: ReactNode;
}

export default function Layout({ children }: layoutProps) {

    const { uid } = useParams<{ uid: string }>();
    const { user, loading } = useUser(uid);

    return (
        <Container maxWidth={"xl"} scrollable>
            <StickyHeader loading={loading} canGoBack>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <UserAvatar user={user} />
                    <Stack>
                        <Typography fontSize={16} fontWeight={600}>{user?.name}</Typography>
                        <Typography color='text.secondary' variant='caption'>{user?.email}</Typography>
                    </Stack>
                </Stack>
            </StickyHeader>

            {children}
        </Container>
    );
}
