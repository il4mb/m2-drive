'use client'

import ActivityView from '@/components/activities/ActivityView';
import ActivitySummary from '@/components/analistic/ActivitiesSummary';
import Container from '@/components/Container';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';
import StickyHeader from '@/components/navigation/StickyHeader';
import PermissionSuspense from '@/components/PermissionSuspense';
import { Activity } from '@/entities/Activity';
import { File, Folder } from '@/entities/File';
import { formatFileSize, formatNumber } from '@/libs/utils';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { Paper, Stack, Typography, Box, Skeleton, IconButton } from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { Activity as ActivityIcon, FolderOpen, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

const LIMIT = 4;
type DetailActivity = Activity & {
    file: File | null;
    folder: Folder | null;
}

export default function PageComponent() {

    const { addAction } = useActionsProvider();
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomObserverRef = useRef<HTMLDivElement>(null);

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [activities, setActivities] = useState<DetailActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || activities.length >= total) return;
        setIsLoadingMore(true);
        setPage(prev => prev + 1);
    }, [isLoadingMore, activities.length, total]);

    useEffect(() => {
        if (!mounted) return;
        setLoading(true);

        const unsubscribe = onSnapshot(
            getMany("activity")
                .debug()
                .relations(['user'])
                .join("file", "file.id = metadata->>'fileId'")
                .join(["file", "folder"], "folder.id = metadata->>'folderId'")
                .orderBy("createdAt", "DESC")
                .limit(page * LIMIT),
            (data) => {
                setActivities(data.rows as any);
                setTotal(data.total);
                setLoading(false);
                setIsLoadingMore(false);
            },
            {
                onError: (error) => {
                    console.error('Error loading activities:', error);
                    setLoading(false);
                    setIsLoadingMore(false);
                }
            }
        );

        return unsubscribe;
    }, [page, mounted]);

    useEffect(() => {
        if (!mounted || !scrollRef.current || loading || isLoadingMore || activities.length >= total) return;

        const checkFill = () => {
            const el = scrollRef.current;
            if (!el) return;

            // Only auto-fill if we have less than a page of content
            const needsMoreContent = el.scrollHeight <= el.clientHeight && activities.length < total;

            if (needsMoreContent) {
                loadMore();
            }
        };

        // Wait for the DOM to update before checking
        const timeoutId = setTimeout(checkFill, 100);
        return () => clearTimeout(timeoutId);
    }, [activities, loading, isLoadingMore, total, mounted, loadMore]);

    useEffect(() => {
        if (!mounted || !bottomObserverRef.current || !scrollRef.current) return;

        const options = {
            root: scrollRef.current,
            threshold: 0.1,
            rootMargin: '100px'
        };

        const bottomObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingMore && activities.length < total) {
                loadMore();
            }
        }, options);

        if (bottomObserverRef.current) bottomObserver.observe(bottomObserverRef.current);

        return () => {
            bottomObserver.disconnect();
        };
    }, [mounted, loadMore, isLoadingMore, activities.length, total]);


    useEffect(() => {
        return addAction("setting", {
            component: () => (
                <IconButton LinkComponent={Link} href={"/settings/activities"}>
                    <Settings size={18} />
                </IconButton>
            )
        })
    }, [])

    const ActivitySkeleton = () => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}>
            <Paper
                elevation={0}
                sx={{
                    px: 2,
                    borderRadius: 2,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }
                }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton
                        variant="circular"
                        width={40}
                        height={40}
                        sx={{
                            animationDuration: '1.5s',
                            animationDelay: '0.1s'
                        }}
                    />
                    <Stack flex={1} spacing={1}>
                        <Skeleton
                            variant="text"
                            width="60%"
                            height={20}
                            sx={{
                                animationDuration: '1.5s',
                                animationDelay: '0.2s'
                            }}
                        />
                        <Skeleton
                            variant="text"
                            width="40%"
                            height={16}
                            sx={{
                                animationDuration: '1.5s',
                                animationDelay: '0.3s'
                            }}
                        />
                    </Stack>
                </Stack>
            </Paper>
        </motion.div>
    );

    return (
        <Container ref={scrollRef} maxWidth={'lg'} scrollable>
            <StickyHeader canGoBack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                        sx={{
                            bgcolor: "primary.main",
                            borderRadius: 1,
                            p: 1,
                            width: 30,
                            height: 30,
                            color: '#fff'
                        }}
                        component={ActivityIcon} size={20} />
                    <Stack>
                        <Typography fontWeight={600} fontSize={18} mb={-1}>
                            Laporan Aktivitas
                        </Typography>
                        {total > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Menampilkan {activities.length} dari {formatNumber(total)} aktivitas
                                </Typography>
                            </motion.div>
                        )}
                    </Stack>
                </Stack>
            </StickyHeader>

            <Stack
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                p={[2, 2, 4]}
                borderRadius={2}
                flex={1}
                spacing={1}
                sx={{
                    backgroundColor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>

                <ActivitySummary />

                <Box sx={{ py: 4 }} />
                <Stack flex={1} p={2}>
                    <Stack direction={"row"} justifyContent={"space-between"}>
                        <Typography fontSize={16} mb={3}>Aktivitas Terbaru</Typography>

                    </Stack>

                    {/* Initial loading */}
                    {loading && activities.length === 0 && (
                        <Box>
                            {Array.from({ length: LIMIT }).map((_, index) => (
                                <ActivitySkeleton key={`initial-skeleton-${index}`} />
                            ))}
                        </Box>
                    )}

                    {/* Current activities */}
                    <AnimatePresence mode="popLayout">
                        {activities.map((activity, index) => {
                            const isNew = index >= (page - 1) * LIMIT;
                            return (
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
                                        delay: isNew ? (index - (page - 1) * LIMIT) * 0.05 : 0,
                                    }}
                                    whileHover={{ y: -2 }}
                                    sx={{
                                        mb: 3
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
                            );
                        })}
                    </AnimatePresence>

                    {/* Next page loading */}
                    {isLoadingMore && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}>
                            <Box>
                                {Array.from({ length: LIMIT }).map((_, index) => (
                                    <ActivitySkeleton key={`next-skeleton-${index}`} />
                                ))}
                            </Box>
                        </motion.div>
                    )}

                    {/* Bottom sentinel */}
                    <div ref={bottomObserverRef} style={{ height: 1 }} />

                    {/* Empty state */}
                    {!loading && activities.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}>
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <motion.div
                                    animate={{
                                        rotate: [0, 5, -5, 0],
                                        scale: [1, 1.05, 1]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 3
                                    }}>
                                    <ActivityIcon size={48} color="#ddd" />
                                </motion.div>
                                <Typography color="text.secondary" mt={1}>
                                    Tidak ada aktivitas yang tercatat
                                </Typography>
                            </Box>
                        </motion.div>
                    )}

                    {/* All loaded message */}
                    {!isLoadingMore && activities.length > 0 && activities.length >= total && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}>
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Semua {formatNumber(total)} aktivitas telah dimuat
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </Stack>
            </Stack>
        </Container>
    );
}