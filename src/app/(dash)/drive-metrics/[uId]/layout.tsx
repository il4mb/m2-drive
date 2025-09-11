'use client'

import Container from '@/components/Container';
import useUser from '@/hooks/useUser';
import { Paper, Stack, Typography, useTheme, IconButton, Button } from '@mui/material';
import { ChevronLeft, FolderOpenDot } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import StickyHeader from '@/components/navigation/StickyHeader';
import Link from 'next/link';
import DriveSummary from '@/components/analistic/DriveSummary';
import { AnimatePresence } from 'motion/react';
import { StickyHeaderManager } from '@/components/navigation/StickyHeaderManager';

export interface layoutProps {
    children?: ReactNode;
}

export default function Layout({ children }: layoutProps) {

    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const { uId } = useParams<{ uId: string }>();
    const { user } = useUser(uId);

    const isDrive = pathname.startsWith(`/drive-metrics/${uId}/drive`)
    const isTrash = pathname.startsWith(`/drive-metrics/${uId}/deleted`)


    return (
        <AnimatePresence mode={"wait"}>
            <Stack flex={1} overflow={"hidden"}>
                <Container maxWidth={'lg'} scrollable>
                    <StickyHeaderManager>
                        <StickyHeader
                            sx={{ width: '100%', maxWidth: '1200px', mx: 'auto' }}
                            actions={
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button
                                        size='small'
                                        LinkComponent={Link}
                                        href={`/drive-metrics/${uId}/drive`}
                                        variant={isDrive ? "contained" : "outlined"}>
                                        Drive
                                    </Button>
                                    <Button
                                        size='small'
                                        color='error'
                                        LinkComponent={Link}
                                        href={`/drive-metrics/${uId}/deleted`}
                                        variant={isTrash ? "contained" : "outlined"}>
                                        Tempat Sampah
                                    </Button>
                                </Stack>
                            }>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton onClick={() => router.back()}>
                                    <ChevronLeft size={16} />
                                </IconButton>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <FolderOpenDot size={28} color={theme.palette.primary.main} />
                                    <Typography fontSize={22} fontWeight={700}>
                                        Drive {user?.name || `#${uId}`}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </StickyHeader>

                        <Stack component={Paper} p={4} mb={4} borderRadius={2} sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
                            <Typography mb={2} fontSize={26}>
                                Statistik Drive {user?.name}
                            </Typography>
                            <DriveSummary user={user || undefined} />
                        </Stack>

                        <Paper sx={{ display: 'flex', flexDirection: 'column', flex: 1, borderRadius: 2, boxShadow: 2, minHeight: 'max(600px, 85vh)' }}>
                            {children}
                        </Paper>
                    </StickyHeaderManager>
                </Container>
            </Stack>
        </AnimatePresence>
    )
}
