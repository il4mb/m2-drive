'use client'

import Container from '@/components/Container';
import useUser from '@/hooks/useUser';
import { useUserDriveSummary } from '@/hooks/useUserDrive';
import { formatFileSize } from '@/libs/utils';
import { Paper, Stack, Typography, useTheme, Divider, Avatar, IconButton } from '@mui/material';
import { ChevronLeft, FolderOpenDot } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ReactNode, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from "motion/react";

export interface layoutProps {
    children?: ReactNode;
}

export default function Layout({ children }: layoutProps) {

    const router = useRouter();
    const theme = useTheme();
    const { uId } = useParams<{ uId: string }>();
    const { user } = useUser(uId);
    const { summary } = useUserDriveSummary(uId);

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
        <Container key={uId} maxWidth="lg" scrollable>
            {/* Sticky Header */}
            <Paper
                key={uId}
                component={motion.div}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                layoutId="header"
                layout
                sx={{
                    p: 2,
                    mb: 2,
                    position: 'sticky',
                    top: 17,
                    zIndex: 10,
                    boxShadow: 4,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.paper
                }}>
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
            </Paper>

            <Container maxWidth='lg'>
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 4 }}>
                    <Stack direction={"row"} pb={2}>
                        <Stack flex={1}>
                            <Stack direction={"row"} gap={1} alignItems={"center"} mb={3}>
                                <Avatar src={user?.meta.avatar} alt={user?.name || "?"} />
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

                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, minHeight: '85dvh' }}>
                    {children}
                </Paper>
            </Container>

        </Container>
    );
}
