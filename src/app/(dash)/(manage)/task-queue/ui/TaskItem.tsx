import AnchorMenu from '@/components/context-menu/AnchorMenu';
import { Task } from '@/entities/Task';
import { epochTime, formatDateFromEpoch } from '@/libs/utils';
import { alpha, Box, Checkbox, Chip, FormControlLabel, IconButton, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import { AlertCircle, CheckCircle, Clock, Hash, MoreVertical, RefreshCw, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode, useMemo } from 'react';
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_ICONS } from './lib';

// Utility functions
const formatDuration = (ms: number) => {
    if (!ms) return '-';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
};

export interface TaskItemProps {
    disabled?: boolean;
    task: Task;
    // isSelected: boolean;
    // selectEnabled: boolean;
    // onSelectionChange: (taskId: string, selected: boolean) => void;
    onRetry: (taskId: string) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
}
export default function TaskItem({ task, disabled = false, onDelete, onRetry }: TaskItemProps) {

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
    ], [task.status, task.id]);

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.2 }}
            sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                // backgroundColor: alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(10px)',
                // '&:hover': {
                //     backgroundColor: isSelected
                //         ? alpha(theme.palette.primary.main, 0.12)
                //         : alpha(theme.palette.action.hover, 0.05),
                //     boxShadow: theme.shadows[1]
                // },
                transition: 'all 0.2s ease',
                // mb: 1
            }}>
            <Stack direction="row" spacing={2} alignItems="center">
                {/* Status */}
                <Box sx={{ minWidth: 100 }}>
                    <Chip
                        icon={<StatusIcon size={14} />}
                        label={task.status.toUpperCase()}
                        size="small"
                        color={STATUS_COLORS[task.status]}
                        variant={task.status === 'processing' ? 'filled' : 'outlined'}
                        sx={{
                            fontWeight: 600,
                            borderRadius: 1
                        }}
                    />
                </Box>

                {/* Task Info */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={600} color="text.primary">
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
                        sx={{ borderRadius: 1 }}
                    />
                </Box>

                {/* Created Time */}
                <Box sx={{ minWidth: 140 }}>
                    <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={500}>
                            {task.createdAt && formatDateFromEpoch(task.createdAt)}
                        </Typography>
                        {task.startedAt && (
                            <Typography variant="caption" color="text.secondary">
                                Started: {formatDateFromEpoch(task.startedAt)}
                            </Typography>
                        )}
                    </Stack>
                </Box>

                {/* Duration */}
                <Box sx={{ minWidth: 80 }}>
                    <Typography variant="body2" fontWeight={500}>
                        {task.startedAt && task.completedAt ? (
                            formatDuration(epochTime(task.completedAt) - epochTime(task.startedAt))
                        ) : task.startedAt ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'info.main' }}>
                                <RefreshCw size={12} style={{ marginRight: 4 }} />
                                Running...
                            </Box>
                        ) : (
                            '-'
                        )}
                    </Typography>
                </Box>

                {/* Actions */}
                <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                    <AnchorMenu items={menuItems} disabled={disabled} >
                        <IconButton size="small" sx={{
                            borderRadius: 1,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                            }
                        }}>
                            <MoreVertical size={16} />
                        </IconButton>
                    </AnchorMenu>
                </Box>
            </Stack>

            {/* Progress Bar */}
            {task.status === 'processing' && (
                <LinearProgress
                    variant="indeterminate"
                    sx={{
                        mt: 1,
                        height: 2,
                        borderRadius: 1,
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: theme.palette.primary.main
                        }
                    }}
                />
            )}
        </Box>
    );
}