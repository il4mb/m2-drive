'use client'

import { Activity } from '@/entities/Activity';
import { getCount, getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { Avatar, Badge, Box, Paper, Stack, SxProps, Typography } from '@mui/material';
import { ActivityIcon, CloudUpload, Copy, CopyX, FilePen, FolderOpen, FolderPlus, GitFork, ScanEye, Share2, Users, Wifi, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createElement, ReactNode, useEffect, useState } from 'react';
import RelativeTime from '../RelativeTime';
import { getColor } from '@/theme/colors';
import { Skeleton } from '@mui/material';

const getTypeIcon = (status: string) => {
    if (status.endsWith("CONTRIBUTOR")) {
        return GitFork;
    }
    switch (status) {
        case 'CONNECT': return Wifi;
        case 'DISCONNECT': return WifiOff;
        case 'SHARE_FILE': return Share2;
        case 'EDIT_FILE': return FilePen;
        case 'VIEW_FILE': return ScanEye;
        case 'VIEW_FOLDER': return FolderOpen;
        case 'UPLOAD_FILE': return CloudUpload;
        case 'COPY_FILE': return Copy;
        case 'MOVE_FILE': return CopyX;
        case 'DELETE_FILE': return CloudUpload;
        case 'CREATE_FOLDER': return FolderPlus;
        default: return ActivityIcon;
    }
};

const getTypeColor = (status: string) => {
    switch (status) {
        case 'CONNECT': return 'success';
        case 'DISCONNECT': return 'error';
        case 'EDIT_FILE': return 'primary';
        case 'DELETE_FILE': return 'error';
        case 'COPY_FILE': return 'warning';
        case 'MOVE_FILE': return 'warning';
        default: return 'default';
    }
};

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Users size={20} />
                <Typography variant="h6" fontWeight="bold">
                    Aktivitas Terbaru
                </Typography>
                {!loading && (
                    <Badge badgeContent={total} color="primary" sx={{ ml: 2 }} />
                )}
            </Box>

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
                )}
            </Stack>
        </Paper>
    );
}