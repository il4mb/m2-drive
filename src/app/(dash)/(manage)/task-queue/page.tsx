'use client'

import Container from '@/components/Container';
import StickyHeader from '@/components/navigation/StickyHeader';
import PermissionSuspense from '@/components/PermissionSuspense';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { formatDuration, formatNumber } from '@/libs/utils';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { getMany } from '@/libs/websocket/query';
import {
    Chip, Paper, Stack, Typography,
    useTheme,
    Badge,
    Button,
    Grid,
    LinearProgress,
    FormControlLabel,
    Switch,
    Box
} from '@mui/material';
import {
    Cpu, Clock, CheckCircle, XCircle,
    RefreshCw,
    ListTree,
    BrushCleaning,
    BarChart3
} from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import TaskTimelineChart, { HourlyStat } from './ui/TaskTimelineChart';
import TaskItem from './ui/TaskItem';
import InfiniteScroll from '@/components/InfiniteScroll';
import { useOption } from '@/hooks/useOption';
import AutoCleaner from './ui/AutoCleaner';

type Summary = {
    hour: string,
    total: number,
    avgExecTime: number | null
}

type StatusChipProps = {
    icon: React.ReactNode;
    label: string;
    count?: number;
    color: any;
    active: boolean;
    onClick: () => void;
}
const StatusChip = ({ icon, label, count, color, active, onClick }: StatusChipProps) => (
    <Button
        startIcon={icon}
        size="small"
        color={color}
        variant={active ? "contained" : "outlined"}
        onClick={onClick}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
            <span>{label}</span>
            {(active && count !== undefined) && (
                <Badge
                    badgeContent={count}
                    color={color}
                    sx={{
                        '& .MuiBadge-badge': {
                            fontSize: '0.6rem',
                            height: 16,
                            minWidth: 16,
                            boxShadow: 2
                        }
                    }}
                />
            )}
        </Stack>
    </Button>
);

export default function TaskQueuePage() {

    const theme = useTheme();
    const [total, setTotal] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    const handleRetry = useCallback(async (taskId: string) => {
        try {
            const result = await invokeFunction("updateTask", {
                taskId,
                data: { status: 'pending' }
            });
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Task restarted successfully", {
                variant: 'success',
                action: CloseSnackbar
            });
        } catch (error: any) {
            enqueueSnackbar(error.message || "Failed to restart task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    }, []);

    const handleDelete = useCallback(async (taskId: string) => {
        try {
            const result = await invokeFunction("deleteTask", { taskId });
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Task deleted successfully", {
                variant: 'success',
                action: CloseSnackbar
            });
        } catch (error: any) {
            enqueueSnackbar(error.message || "Failed to delete task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    }, []);

    const [error, setError] = useState<string | null>();
    const query = useMemo(() => {
        const query = getMany("task").orderBy("createdAt", "DESC");
        if (filter !== "all") {
            query.where("status", "==", filter);
        }
        return query;
    }, [filter]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [summary, setSummary] = useState<Summary[]>([]);
    const timelineChartData = useMemo(() => {
        if (!summary || summary.length === 0) return [];

        const map = new Map<string, HourlyStat>();
        summary.forEach(item => {
            const hour = item.hour.padStart(2, "0");
            map.set(hour, {
                hour: parseInt(hour, 10),
                total: item.total,
                avgExecTime: item.avgExecTime || 0,
            });
        });

        const now = new Date();
        const currentHour = now.getHours();

        const data: { hour: string; total: number; avgExecTime: number }[] = [];
        for (let i = 23; i >= 0; i--) {
            const h = (currentHour - i + 24) % 24;
            const key = h.toString().padStart(2, "0");
            const stat = map.get(key);

            data.push({
                hour: `${key}:00`,
                total: stat?.total ?? 0,
                avgExecTime: stat?.avgExecTime ?? 0,
            });
        }

        return data;
    }, [summary]);

    const averageTime = useMemo(() => {
        const total = summary.length;
        if (total === 0) return 0;
        const sumAverage = summary.reduce((prev, current) => prev + (current.avgExecTime || 0), 0);
        return sumAverage / total;
    }, [summary]);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        invokeFunction("getTaskHourlySummary")
            .then(result => {
                if (!result.success) setError(result.error);
                setSummary(result.data || []);
            });
    }, [mounted]);

    return (
        <Container ref={scrollRef} maxWidth='xl' scrollable sx={{ p: 3 }}>
            <StickyHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" spacing={2}>
                    <Stack alignItems="center" spacing={1} direction="row">
                        <Cpu size={28} color={theme.palette.primary.main} />
                        <Typography variant="h4" fontWeight={700}>
                            Task Queue
                        </Typography>
                        <Badge
                            badgeContent={total}
                            color="primary"
                            showZero
                            sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.75rem',
                                    height: 20,
                                    minWidth: 20
                                }
                            }}>
                            <Chip
                                label={`${formatNumber(total)} total tasks`}
                                size="medium"
                                variant="outlined"
                                sx={{
                                    ml: 2,
                                    borderRadius: 2,
                                    borderWidth: 2,
                                    fontWeight: 500
                                }}
                            />
                        </Badge>
                    </Stack>
                </Stack>
            </StickyHeader>

            <Stack spacing={3} mt={2}>
                {/* Performance Metrics */}
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                        <BarChart3 size={24} color={theme.palette.primary.main} />
                        <Typography variant="h6" fontWeight={600}>
                            Performance Metrics
                        </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                        Average Execution Time
                                    </Typography>
                                    <Typography variant="h6" fontWeight={600}>
                                        {formatDuration(averageTime)}
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min((averageTime / 10000) * 100, 100)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Stack spacing={1}>
                                <Typography variant="body2" color="text.secondary">
                                    Tasks Distribution (Last 24h)
                                </Typography>
                                <TaskTimelineChart data={timelineChartData} />
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Main Content */}
                <Grid container spacing={3} flexWrap={"wrap-reverse"}>
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <Paper sx={{ p: 2, borderRadius: 3 }}>

                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={1}>
                                <StatusChip
                                    icon={<Cpu size={14} />}
                                    label="All"
                                    count={total}
                                    color="primary"
                                    active={filter === 'all'}
                                    onClick={() => setFilter('all')}
                                />
                                <StatusChip
                                    icon={<Clock size={14} />}
                                    label="Pending"
                                    count={total}
                                    color="warning"
                                    active={filter === 'pending'}
                                    onClick={() => setFilter('pending')}
                                />
                                <StatusChip
                                    icon={<RefreshCw size={14} />}
                                    label="Processing"
                                    count={total}
                                    color="info"
                                    active={filter === 'processing'}
                                    onClick={() => setFilter('processing')}
                                />
                                <StatusChip
                                    icon={<CheckCircle size={14} />}
                                    label="Completed"
                                    count={total}
                                    color="success"
                                    active={filter === 'completed'}
                                    onClick={() => setFilter('completed')}
                                />
                                <StatusChip
                                    icon={<XCircle size={14} />}
                                    label="Failed"
                                    count={total}
                                    color="error"
                                    active={filter === 'error'}
                                    onClick={() => setFilter('error')}
                                />
                            </Stack>

                            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                                <ListTree size={24} color={theme.palette.primary.main} />
                                <Typography variant="h6" fontWeight={600}>
                                    Task List
                                </Typography>
                            </Stack>

                            <Stack sx={{ overflowX: 'scroll' }} className='no-scrollbar'>
                                <InfiniteScroll
                                    sx={{ flex: 1, minHeight: 700 }}
                                    scrollRef={scrollRef}
                                    query={query}
                                    onResult={({ total }) => setTotal(total)}
                                    renderItem={({ item }) => (
                                        <TaskItem
                                            task={item}
                                            onDelete={handleDelete}
                                            onRetry={handleRetry}
                                        />
                                    )}
                                />
                            </Stack>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Stack spacing={2}>
                            {/* Auto Cleaner */}
                            <AutoCleaner />
                        </Stack>
                    </Grid>
                </Grid>
            </Stack>
        </Container>
    );
}