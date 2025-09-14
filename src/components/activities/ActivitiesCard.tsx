'use client'

import { Activity } from '@/entities/Activity';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { Badge, Box, Paper, Stack, SxProps, Typography } from '@mui/material';
import { FolderOpen, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useEffect, useState } from 'react';
import { Skeleton } from '@mui/material';
import ActivitiesButton from './ActivitiesButton';
import ActivityView from './ActivityView';
import { Folder } from '@/entities/File';
import { FileIcon } from '@untitledui/file-icons';
import { formatFileSize } from '@/libs/utils';

type DetailActivity = Activity & {
    file: File | null;
    folder: Folder | null;
}

export interface ActivityCardProps {
    children?: ReactNode;
    userId?: string;
    sx?: SxProps;
}
export default function ActivitiesCard({ sx, userId }: ActivityCardProps) {

    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<DetailActivity[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setLoading(true);
        const query = getMany("activity")
            .relations(['user'])
            .join("file", "file.id = metadata->>'fileId'")
            .join(["file", "folder"], "folder.id = metadata->>'folderId'")
            .orderBy("createdAt", "DESC")
            .limit(8)

        if (userId) {
            query.where("userId", "==", userId)
        }

        return onSnapshot(
            query,
            (data) => {

                setLoading(false);
                setActivities(data.rows as any);
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

            <Stack spacing={3}>
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
                            <Box
                                component={motion.div}
                                key={activity.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                    delay: 0.1 * index,
                                }}
                                whileHover={{ y: -2 }}
                                sx={{
                                    mb: 4
                                }}>
                                <ActivityView activity={activity}>
                                    {activity.folder && (
                                        <Stack mt={1} p={1}>
                                            <Stack
                                                direction={"row"}
                                                spacing={1}
                                                alignItems={"center"}>
                                                {activity.folder.type == "folder"
                                                    ? <FolderOpen size={26} />
                                                    : <FileIcon
                                                        variant='solid'
                                                        size={26}
                                                        // @ts-ignore
                                                        type={activity.folder.meta.mimeType || "empty"} />
                                                }
                                                <Stack>
                                                    <Typography>{activity.folder.name}</Typography>
                                                    <Typography variant='caption' color='text.secondary' fontSize={10}>
                                                        {activity.folder.type == "folder"
                                                            // @ts-ignore
                                                            ? activity.folder.meta.itemCount + ' items'
                                                            // @ts-ignore
                                                            : formatFileSize(activity.folder.meta.size || 0)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    )}

                                    {activity.file && (
                                        <Stack mt={0} p={1}>
                                            <Stack
                                                direction={"row"}
                                                spacing={1}
                                                alignItems={"center"}>
                                                {activity.file.type == "folder"
                                                    ? <FolderOpen size={26} />
                                                    : <FileIcon
                                                        variant='solid'
                                                        size={26}
                                                        // @ts-ignore
                                                        type={activity.file.meta.mimeType || "empty"} />
                                                }
                                                <Stack>
                                                    <Typography>{activity.file.name}</Typography>
                                                    <Typography variant='caption' color='text.secondary' fontSize={10}>
                                                        {activity.file.type == "folder"
                                                            // @ts-ignore
                                                            ? activity.file.meta.itemCount + ' items'
                                                            // @ts-ignore
                                                            : formatFileSize(activity.file.meta.size || 0)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    )}

                                </ActivityView>
                            </Box>
                        ))}
                    </AnimatePresence>
                )}
            </Stack>
        </Paper>
    );
}