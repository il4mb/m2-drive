'use client'

import Container from '@/components/Container';
import useUser from '@/hooks/useUser';
import { useUserDriveSummary } from '@/hooks/useDrive';
import { formatFileSize } from '@/libs/utils';
import { Paper, Stack, Typography, useTheme, Divider, Avatar, IconButton, Button } from '@mui/material';
import { ChevronLeft, FolderOpenDot } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StickyHeader from '@/components/StickyHeader';
import Link from 'next/link';
import UserAvatar from '@/components/ui/UserAvatar';

export interface layoutProps {
    children?: ReactNode;
}

export default function Layout({ children }: layoutProps) {

    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const { uId } = useParams<{ uId: string }>();
    const { user } = useUser(uId);
    const { summary } = useUserDriveSummary(uId);

    const isDrive = pathname.startsWith(`/drive-root/${uId}/drive`)
    const isTrash = pathname.startsWith(`/drive-root/${uId}/deleted`)

    // Prepare data for pie chart
    const mimeData = useMemo(() =>
        Object.entries(summary?.mimeBreakdown || {}).map(([type, count]) => ({ type, count })),
        [summary]
    );

    const COLORS = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        '#4CAF50',
        '#FF9800',
        '#9E9E9E'
    ];

    return (
        <Container key={uId} maxWidth="xl" scrollable>
            {/* Sticky Header */}

            <StickyHeader sx={{ width: '100%', maxWidth: '1200px', mx: 'auto' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent={"space-between"}>
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
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            size='small'
                            LinkComponent={Link}
                            href={`/drive-root/${uId}/drive`}
                            variant={isDrive ? "contained" : "outlined"}>
                            Drive
                        </Button>
                        <Button
                            size='small'
                            color='error'
                            LinkComponent={Link}
                            href={`/drive-root/${uId}/deleted`}
                            variant={isTrash ? "contained" : "outlined"}>
                            Tempat Sampah
                        </Button>
                    </Stack>
                </Stack>
            </StickyHeader>

            <Paper sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: 2,
                mb: 4,
                width: '100%',
                maxWidth: '1200px',
                mx: 'auto'
            }}>
                <Stack direction={"row"} pb={2}>
                    <Stack flex={1}>
                        <Stack direction={"row"} gap={1} alignItems={"center"} mb={3}>
                            <UserAvatar userId={user?.id} />
                            <Stack>
                                <Typography fontSize={18} fontWeight={600}>{user?.name || "Unknown"}</Typography>
                                <Typography color='text.secondary'>{user?.email}</Typography>
                            </Stack>
                        </Stack>
                        <Stack>
                            <Typography variant="h6" gutterBottom>
                                Summary
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={1}>
                                <Typography variant="body1">Files: <strong>{summary?.fileCount}</strong></Typography>
                                <Typography variant="body1">Folders: <strong>{summary?.folderCount}</strong></Typography>
                                <Typography variant="body1">Total Size: <strong>{formatFileSize(summary?.totalSize || 0)}</strong></Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                    {Boolean(summary?.fileCount) && (
                        <Stack flexBasis={400} minHeight={300}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={mimeData}
                                        dataKey="count"
                                        nameKey="type"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={4}
                                        label>
                                        {mimeData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value} files`} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        wrapperStyle={{ fontSize: '0.75rem', fontWeight: 500 }}
                                    />

                                </PieChart>
                            </ResponsiveContainer>
                        </Stack>
                    )}
                </Stack>
            </Paper>
            
            {children}

        </Container>
    );
}
