'use client'

import { Activity } from '@/entities/Activity';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { Badge, Box, Paper, Stack, SxProps, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useEffect, useState } from 'react';
import { Skeleton } from '@mui/material';
import ActivitiesButton from './ActivitiesButton';
import ActivityView from './ActivityView';

export interface ActivityCardProps {
    children?: ReactNode;
    userId?: string;
    sx?: SxProps;
}
export default function ActivitiesCard({ sx, userId }: ActivityCardProps) {

    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setLoading(true);
        const query = getMany("activity")
            .relations(['user'])
            .orderBy("createdAt", "DESC")
            .limit(14)

        if (userId) {
            query.where("userId", "==", userId)
        }

        return onSnapshot(
            query,
            (data) => {

                setLoading(false);
                setActivities(data.rows);
                setTotal(data.total)
            }
        )
    }, [userId]);

    return (
        <Paper sx={{ borderRadius: 2, p: 3, flex: 1, minWidth: 300, ...sx }}>
            <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"} mb={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Users size={20} />
                    <Typography variant="h6" fontWeight="bold">
                        Aktivitas Terbaru
                    </Typography>
                    {!loading && (
                        <Badge badgeContent={total} color="primary" sx={{ ml: 2 }} />
                    )}
                </Box>
                <ActivitiesButton />
            </Stack>

            <Stack spacing={2}>
                {loading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Skeleton variant="circular" width={32} height={32} />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width="80%" height={20} />
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                    <Skeleton variant="circular" width={14} height={14} sx={{ mr: 1 }} />
                                    <Skeleton variant="text" width="60%" height={16} />
                                </Box>
                            </Box>
                        </Box>
                    ))
                ) : activities.length === 0 ? (
                    // No activities state
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 4,
                        color: 'text.secondary'
                    }}>
                        <Users size={40} />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Tidak ada aktivitas
                        </Typography>
                    </Box>
                ) : (
                    // Activities list
                    <AnimatePresence>
                        {activities.map((activity, index) => (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}>
                                <ActivityView activity={activity}/>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </Stack>
        </Paper>
    );
}