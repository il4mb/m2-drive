'use client'

import { formatNumber } from '@/libs/utils';
import { Query } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { EntityMap, EntityName } from '@/server/database';
import { Paper, Skeleton, Stack, SxProps, Box, Typography } from '@mui/material';
import { CircleSlash } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createElement, FC, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from 'react';


const LIMIT = 4;
export interface InfiniteScrollProps<T extends EntityName, E = InstanceType<EntityMap[T]>> {
    query: Query<T, 'list'>,
    scrollRef: RefObject<HTMLElement | null>;
    sx?: SxProps;
    renderItem: FC<{ item: E }>;
    emptyState?: ReactNode;
    noMoreState?: ReactNode | FC<{ total: number }>;
    onResult?: (data: { rows: E[], total: number }) => void;
}

export default function InfiniteScroll<T extends EntityName>({
    scrollRef,
    query: initialQuery,
    sx,
    renderItem,
    emptyState,
    noMoreState,
    onResult
}: InfiniteScrollProps<T>) {

    const [mounted, setMounted] = useState(false);
    const bottomObserverRef = useRef<HTMLDivElement>(null);

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || rows.length >= total) return;
        setIsLoadingMore(true);
        setPage(prev => prev + 1);
    }, [isLoadingMore, rows.length, total]);


    useEffect(() => setMounted(true), []);
    useEffect(() => {
        setPage(1);
    }, [initialQuery])

    useEffect(() => {
        if (!mounted) return;
        setLoading(true);

        const query = Query.createFrom(initialQuery);
        query.limit(page * LIMIT);

        const unsubscribe = onSnapshot(
            query,
            (data) => {
                setRows(data.rows as T[]);
                setTotal(data.total);
                setLoading(false);
                setIsLoadingMore(false);
                onResult?.(data);
            },
            {
                onError: (error) => {
                    console.error('Error loading rows:', error);
                    setLoading(false);
                    setIsLoadingMore(false);
                }
            }
        );

        return unsubscribe;
    }, [page, mounted, initialQuery]);

    useEffect(() => {
        if (!mounted || !scrollRef.current || loading || isLoadingMore || rows.length >= total) return;

        const checkFill = () => {
            const el = scrollRef.current;
            if (!el) return;

            // Only auto-fill if we have less than a page of content
            const needsMoreContent = el.scrollHeight <= el.clientHeight && rows.length < total;

            if (needsMoreContent) {
                loadMore();
            }
        };

        // Wait for the DOM to update before checking
        const timeoutId = setTimeout(checkFill, 100);
        return () => clearTimeout(timeoutId);
    }, [rows, loading, isLoadingMore, total, mounted, loadMore]);

    useEffect(() => {
        if (!mounted || !bottomObserverRef.current || !scrollRef.current) return;

        const options = {
            root: scrollRef.current,
            threshold: 0.1,
            rootMargin: '100px'
        };

        const bottomObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingMore && rows.length < total) {
                loadMore();
            }
        }, options);

        if (bottomObserverRef.current) bottomObserver.observe(bottomObserverRef.current);

        return () => {
            bottomObserver.disconnect();
        };
    }, [mounted, loadMore, isLoadingMore, rows.length, total]);


    const Skeletons = ({ index }: { index: number }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}>
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
                            height={25}
                            sx={{
                                animationDuration: '1.5s',
                                animationDelay: '0.2s'
                            }}
                        />
                        <Skeleton
                            variant="text"
                            width="40%"
                            height={20}
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
        <Stack sx={{ gap: 1, ...sx }}>
            {/* Initial loading */}
            {loading && rows.length === 0 && (
                <AnimatePresence>
                    {Array.from({ length: LIMIT }).map((_, index) => (
                        <Skeletons key={`initial-skeleton-${index}`} index={index} />
                    ))}
                </AnimatePresence>
            )}

            {/* Current activities */}
            <AnimatePresence mode="popLayout">
                {rows.map((item, index) => {
                    const isNew = index >= (page - 1) * LIMIT;
                    return (
                        <Box
                            component={motion.div}
                            key={item.id || index}
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
                            whileHover={{ y: -2 }}>
                            {createElement(renderItem, { item })}
                        </Box>
                    );
                })}
            </AnimatePresence>

            {/* Next page loading */}
            <AnimatePresence>
                {isLoadingMore && Array.from({ length: LIMIT }).map((_, index) => (
                    <Skeletons key={`next-skeleton-${index}`} index={index} />
                ))}
            </AnimatePresence>

            {/* Bottom sentinel */}
            <div ref={bottomObserverRef} style={{ height: 1 }} />

            {/* Empty state */}
            {!loading && rows.length === 0 && (
                <Stack
                    component={motion.div}
                    sx={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}>
                    {emptyState ? emptyState : (
                        <>
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
                                    <CircleSlash size={48} color="#ddd" />
                                </motion.div>
                                <Typography color="text.secondary" mt={1}>
                                    Tidak ada row yang tercatat
                                </Typography>
                            </Box>
                        </>
                    )}
                </Stack>
            )}

            {/* All loaded message */}
            {!isLoadingMore && rows.length > 0 && rows.length >= total && (
                <Stack
                    component={motion.div}
                    sx={{ flex: 1 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}>
                    {noMoreState ? (typeof noMoreState == "function" ? createElement(noMoreState, { total }) : noMoreState) : (
                        <>
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Semua {formatNumber(total)} rows telah dimuat
                                </Typography>
                            </Box>
                        </>
                    )}
                </Stack>
            )}

        </Stack>
    )
}