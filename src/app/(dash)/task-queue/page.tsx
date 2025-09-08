'use client'

import Container from '@/components/Container';
import AnchorMenu from '@/components/context-menu/AnchorMenu';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';
import StickyHeader from '@/components/navigation/StickyHeader';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { Task } from '@/entity/Task';
import { epochTime, formatLocaleDate } from '@/libs/utils';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import {
    Box, Chip, Paper, Stack, Typography, LinearProgress, IconButton,
    alpha, useTheme, Switch, FormControlLabel, Tooltip,
    Badge, Checkbox
} from '@mui/material';
import {
    Cpu, MoreVertical, Clock, CheckCircle, XCircle, Play,
    AlertCircle, RefreshCw, Hash, Trash2, RotateCcw
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo, useState, useCallback } from 'react';

// Constants
const STATUS_COLORS = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error'
} as const;

const STATUS_ICONS = {
    pending: Clock,
    processing: RefreshCw,
    completed: CheckCircle,
    failed: XCircle
} as const;

const PRIORITY_COLORS = {
    0: 'default',
    1: 'info',
    2: 'warning',
    3: 'error'
} as const;

const STATUS_FILTERS = [
    { value: 'all', label: 'All', color: 'default' },
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'processing', label: 'Processing', color: 'info' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'failed', label: 'Failed', color: 'error' }
] as const;

// Utility functions
const formatDuration = (ms: number) => {
    if (!ms) return '-';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
};

// Components
interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    selectEnabled: boolean;
    onSelectionChange: (taskId: string, selected: boolean) => void;
    onRetry: (taskId: string) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
}

const TaskItem = ({
    task,
    isSelected,
    selectEnabled,
    onSelectionChange,
    onRetry,
    onDelete
}: TaskItemProps) => {
    const theme = useTheme();
    const StatusIcon = STATUS_ICONS[task.status];
    const priorityColor = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || 'default';

    const menuItems = useMemo(() => [
        ...(task.status === "failed" ? [{
            label: "Coba lagi",
            icon: RotateCcw,
            action: () => onRetry(task.id)
        }] : []),
        {
            label: "Hapus",
            icon: Trash2,
            action: () => onDelete(task.id)
        }
    ], [task.status, task.id, onRetry, onDelete]);

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.2 }}
            sx={{
                p: 2,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                '&:last-child': { borderBottom: 'none' },
                '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.05)
                },
                backgroundColor: isSelected ? alpha(theme.palette.info.main, 0.1) : 'transparent'
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                {/* Selection Checkbox */}
                {selectEnabled && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={isSelected}
                                onChange={(e) => onSelectionChange(task.id, e.target.checked)}
                            />
                        }
                        label=""
                    />
                )}

                {/* Status */}
                <Box sx={{ minWidth: 100 }}>
                    <Chip
                        icon={<StatusIcon size={14} />}
                        label={task.status.toUpperCase()}
                        size="small"
                        color={STATUS_COLORS[task.status]}
                        variant={task.status === 'processing' ? 'filled' : 'outlined'}
                    />
                </Box>

                {/* Task Info */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                        {task.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        ID: {task.id.slice(0, 8)}...
                    </Typography>
                    {task.error && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                            <AlertCircle size={12} style={{ marginRight: 4 }} />
                            {task.error}
                        </Typography>
                    )}
                </Box>

                {/* Priority */}
                <Box sx={{ minWidth: 80 }}>
                    <Chip
                        icon={<Hash size={14} />}
                        label={`P${task.priority}`}
                        size="small"
                        color={priorityColor}
                        variant="outlined"
                    />
                </Box>

                {/* Created Time */}
                <Box sx={{ minWidth: 140 }}>
                    <Stack spacing={0.5}>
                        <Typography variant="body2">
                            {task.createdAt && formatLocaleDate(task.createdAt)}
                        </Typography>
                        {task.startedAt && (
                            <Typography variant="caption" color="text.secondary">
                                Started: {formatLocaleDate(task.startedAt)}
                            </Typography>
                        )}
                    </Stack>
                </Box>

                {/* Duration */}
                <Box sx={{ minWidth: 80 }}>
                    <Typography variant="body2">
                        {task.startedAt && task.completedAt ? (
                            formatDuration(epochTime(task.completedAt) - epochTime(task.startedAt))
                        ) : task.startedAt ? (
                            'Running...'
                        ) : (
                            '-'
                        )}
                    </Typography>
                </Box>

                {/* Actions */}
                <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                    <AnchorMenu items={menuItems}>
                        <IconButton size="small">
                            <MoreVertical size={16} />
                        </IconButton>
                    </AnchorMenu>
                </Box>
            </Stack>

            {/* Progress Bar */}
            {task.status === 'processing' && (
                <LinearProgress
                    variant="indeterminate"
                    sx={{ mt: 1, height: 2, borderRadius: 1 }}
                />
            )}
        </Box>
    );
};

const EmptyState = () => {
    const theme = useTheme();

    return (
        <Stack flex={1} alignItems="center" justifyContent="center" sx={{ p: 6 }}>
            <Box textAlign={"center"}>
                <Play size={48} color={theme.palette.text.secondary} />
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                    No tasks found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Tasks will appear here when they are created.
                </Typography>
            </Box>
        </Stack>
    );
};

const SelectionHeader = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onBulkDelete,
    onBulkRetry,
    canBulkRetry
}: {
    selectedCount: number;
    totalCount: number;
    onSelectAll: (select: boolean) => void;
    onBulkDelete: () => void;
    onBulkRetry: () => void;
    canBulkRetry: boolean;
}) => {
    const theme = useTheme();

    return (
        <Stack alignItems="center" direction="row" spacing={2} sx={{
            p: 2,
            bgcolor: alpha(theme.palette.info.main, 0.1)
        }}>
            <Checkbox onChange={e => onSelectAll(e.target.checked)} />
            <Box>
                <Typography variant="body2" color="info.main">
                    Selected {selectedCount} of {totalCount} tasks
                </Typography>
            </Box>
            {selectedCount > 0 && (
                <>
                    <Tooltip title="Delete selected">
                        <IconButton size='small' onClick={onBulkDelete}>
                            <Trash2 size={18} />
                        </IconButton>
                    </Tooltip>
                    {canBulkRetry && (
                        <Tooltip title="Retry selected">
                            <IconButton size='small' onClick={onBulkRetry}>
                                <RotateCcw size={18} />
                            </IconButton>
                        </Tooltip>
                    )}
                </>
            )}
        </Stack>
    );
};

export default function TaskQueuePage() {
    const { addAction } = useActionsProvider();
    const theme = useTheme();

    const [selectEnabled, setSelectEnabled] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [sortBy] = useState('createdAt');
    const [order] = useState<'ASC' | 'DESC'>('DESC');
    const [filter, setFilter] = useState<string>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [taskList, setTaskList] = useState<Task[]>([]);

    // Memoized computations
    const filteredTasks = useMemo(() => {
        return taskList.filter(task => filter === 'all' || task.status === filter);
    }, [taskList, filter]);

    const stats = useMemo(() => ({
        total: taskList.length,
        pending: taskList.filter(t => t.status === 'pending').length,
        processing: taskList.filter(t => t.status === 'processing').length,
        completed: taskList.filter(t => t.status === 'completed').length,
        failed: taskList.filter(t => t.status === 'failed').length
    }), [taskList]);

    const canBulkRetry = useMemo(() =>
        selected.every(id => taskList.find(task => task.id === id)?.status === "failed"),
        [selected, taskList]
    );

    // Event handlers
    const handleRetry = useCallback(async (taskId: string) => {
        try {
            const result = await invokeFunction("updateTask", {
                taskId,
                data: { status: 'pending' }
            });
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Berhasil restart task", {
                variant: 'success',
                action: CloseSnackbar
            });
        } catch (error: any) {
            enqueueSnackbar(error.message || "Gagal restart task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    }, []);

    const handleDelete = useCallback(async (taskId: string) => {
        try {
            const result = await invokeFunction("deleteTask", { taskId });
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Berhasil hapus task", {
                variant: 'success',
                action: CloseSnackbar
            });
            setSelected(prev => prev.filter(id => id !== taskId));
        } catch (error: any) {
            enqueueSnackbar(error.message || "Gagal hapus task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    }, []);

    const handleBulkDelete = useCallback(async () => {
        if (selected.length === 0) return;

        try {

            const result = await invokeFunction("bulkDeleteTask", { tasksId: selected });
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar(`Berhasil hapus ${result.data?.affected} task`, {
                variant: 'success',
                action: CloseSnackbar
            });
            setSelected([]);
        } catch (error: any) {
            enqueueSnackbar(error.message || "Gagal hapus task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    }, [selected]);

    const handleBulkRetry = useCallback(async () => {
        if (selected.length === 0) return;

        try {
            for (const taskId of selected) {
                await handleRetry(taskId);
            }
        } catch (error: any) {
            enqueueSnackbar(error.message || "Gagal restart task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    }, [selected, handleRetry]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    }, []);

    const handleSelectionChange = useCallback((taskId: string, selected: boolean) => {
        setSelected(prev => selected
            ? [...prev, taskId]
            : prev.filter(id => id !== taskId)
        );
    }, []);

    const handleSelectAll = useCallback((select: boolean) => {
        setSelected(select ? filteredTasks.map(task => task.id) : []);
    }, [filteredTasks]);

    // Effects
    useEffect(() => {
        const query = getMany("task").debug();
        if (sortBy) {
            query.orderBy(sortBy, order);
        }
        if (filter && filter !== 'all') {
            query.where("status", "==", filter);
        }

        const unsubscribe = onSnapshot(query, setTaskList);
        return unsubscribe;
    }, [sortBy, order, filter]);

    useEffect(() => {
        return addAction("filter", {
            position: 10,
            component: () => (
                <AnchorMenu
                    items={STATUS_FILTERS.map(item => ({
                        label: item.label,
                        action: () => setFilter(item.value),
                        active: filter === item.value
                    }))}
                />
            ),
            icon: undefined
        });
    }, [addAction, filter]);

    return (
        <Container maxWidth='xl' scrollable>
            <StickyHeader
                actions={
                    <>
                        <Tooltip title="Refresh">
                            <IconButton onClick={handleRefresh}>
                                <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
                            </IconButton>
                        </Tooltip>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={selectEnabled}
                                    onChange={(e) => setSelectEnabled(e.target.checked)}
                                />
                            }
                            label="Select"
                        />
                    </>
                }>
                <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
                    <Stack alignItems="center" spacing={1} direction="row">
                        <Cpu size={24} />
                        <Typography fontSize={20} fontWeight={600}>Task Queue</Typography>
                        <Badge badgeContent={filteredTasks.length} color="primary" showZero>
                            <Chip
                                label={`${stats.total} total`}
                                size="small"
                                variant="outlined"
                                sx={{ ml: 2 }}
                            />
                        </Badge>
                    </Stack>
                </Stack>
            </StickyHeader>

            <Paper
                component={Stack}
                flex={1}
                sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}>
                {selectEnabled && (
                    <SelectionHeader
                        selectedCount={selected.length}
                        totalCount={filteredTasks.length}
                        onSelectAll={handleSelectAll}
                        onBulkDelete={handleBulkDelete}
                        onBulkRetry={handleBulkRetry}
                        canBulkRetry={canBulkRetry}
                    />
                )}

                <Stack flex={1} spacing={0}>
                    <AnimatePresence mode='popLayout'>
                        {filteredTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                isSelected={selected.includes(task.id)}
                                selectEnabled={selectEnabled}
                                onSelectionChange={handleSelectionChange}
                                onRetry={handleRetry}
                                onDelete={handleDelete}
                            />
                        ))}
                    </AnimatePresence>
                    {filteredTasks.length === 0 && <EmptyState />}
                </Stack>
            </Paper>

            <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </Container>
    );
}