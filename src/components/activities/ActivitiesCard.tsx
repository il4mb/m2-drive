'use client'

import { Activity } from '@/entities/Activity';
import { formatLocaleDate, toRelativeTime } from '@/libs/utils';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { Avatar, Badge, Box, Chip, Paper, Stack, SxProps, Typography } from '@mui/material';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createElement, ReactNode, useEffect, useState } from 'react';
import RelativeTime from '../RelativeTime';
import { getColor } from '@/theme/colors';

const getTypeIcon = (status: string) => {
    switch (status) {
        case 'CONNECT': return Wifi;
        case 'DISCONNECT': return WifiOff;
        case 'processing': return 'primary';
        case 'pending': return 'default';
        default: return 'default';
    }
};

const getTypeColor = (status: string) => {
    switch (status) {
        case 'CONNECT': return 'success';
        case 'DISCONNECT': return 'error';
        case 'processing': return 'primary';
        case 'pending': return 'default';
        default: return 'default';
    }
};

export interface ActivityCardProps {
    children?: ReactNode;
    userId?: string;
    sx?: SxProps;
}
export default function ActivitiesCard({ sx, userId }: ActivityCardProps) {

    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {

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
                setActivities(data)
            }
        )
    }, [userId])

    return (
        <Paper sx={{ borderRadius: 2, p: 3, flex: 1, minWidth: 300, ...sx }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Users size={20} />
                <Typography variant="h6" fontWeight="bold">
                    Aktivitas Terbaru
                </Typography>
                <Badge badgeContent={activities.length} color="primary" sx={{ ml: 1 }} />
            </Box>

            <Stack spacing={2}>
                <AnimatePresence>
                    {activities.map((activity, index) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Avatar sx={{ background: getColor(getTypeColor(activity.type) as any)[400], width: 32, height: 32 }}>
                                    {createElement(getTypeIcon(activity.type), { size: 18 })}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight="medium">
                                        {activity.description}
                                    </Typography>
                                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                        <Avatar src={activity.user.meta.avatar} sx={{ bgcolor: 'primary.main', width: 14, height: 14 }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {activity.user.name} • <RelativeTime timestamp={activity.createdAt} />
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Box>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </Stack>
        </Paper>
    );
}