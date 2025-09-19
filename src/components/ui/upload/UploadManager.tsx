'use client';

import {
    Stack,
    Paper,
    Typography,
    Chip,
    Box,
    IconButton,
    Tooltip,
    alpha,
    useTheme} from '@mui/material';
import UploadView from './UploadView';
import { FileUpload } from '@/types';
import { useState, useMemo } from 'react';
import {
    X,
    CheckCircle,
    AlertCircle,
    PauseCircle,
    PlayCircle,
    Clock,
    UploadCloud} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UploadManagerProps {
    uploads: FileUpload[];
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2
        }
    }
};

const chipVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    selected: {
        scale: 1.1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 17
        }
    }
};



export default function UploadManager({ uploads = [] }: UploadManagerProps) {

    const theme = useTheme();
    const [sortEnabled, setSortEnabled] = useState(false);
    const [filterStatus, setFilterStatus] = useState<FileUpload['status'] | 'all'>('all');

    // Priority map for sorting
    const priority: Record<FileUpload['status'], number> = {
        uploading: 1,
        pending: 2,
        pause: 3,
        error: 4,
        stop: 5,
        finishing: 6,
        done: 7,
    };

    const statusConfig: Record<FileUpload['status'], { color: string; icon: React.ReactNode; label: string }> = {
        uploading: { color: theme.palette.info.main, icon: <PlayCircle size={14} />, label: 'Uploading' },
        pending: { color: theme.palette.warning.main, icon: <Clock size={14} />, label: 'Pending' },
        pause: { color: theme.palette.warning.main, icon: <PauseCircle size={14} />, label: 'Paused' },
        error: { color: theme.palette.error.main, icon: <AlertCircle size={14} />, label: 'Error' },
        stop: { color: theme.palette.error.main, icon: <X size={14} />, label: 'Stopped' },
        finishing: { color: theme.palette.info.main, icon: <UploadCloud size={14} />, label: 'Finishing' },
        done: { color: theme.palette.success.main, icon: <CheckCircle size={14} />, label: 'Completed' },
    };

    const displayUploads = useMemo(() => {
        let filtered = uploads;

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = uploads.filter(upload => upload.status === filterStatus);
        }

        // Sort by priority if enabled
        if (sortEnabled) {
            return [...filtered].sort(
                (a, b) => (priority[a.status] ?? 999) - (priority[b.status] ?? 999)
            );
        }

        return filtered;
    }, [uploads, sortEnabled, filterStatus]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: uploads.length };
        uploads.forEach(upload => {
            counts[upload.status] = (counts[upload.status] || 0) + 1;
        });
        return counts;
    }, [uploads]);

    const clearFilter = () => setFilterStatus('all');

    return (
        <Stack
            flex={1}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            <Stack flex={1}>

                {/* Status Filter Chips */}
                <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" gap={1}>
                    <motion.div
                        // @ts-ignore
                        variants={chipVariants}
                        whileHover="hover"
                        whileTap="tap">
                        <Chip
                            label={`All (${statusCounts.all})`}
                            variant={filterStatus === 'all' ? 'filled' : 'outlined'}
                            color={filterStatus === 'all' ? 'primary' : 'default'}
                            onClick={() => setFilterStatus('all')}
                            size="small"
                        />
                    </motion.div>

                    {Object.entries(statusConfig).map(([status, config]) => (
                        <motion.div
                            key={status}
                            // @ts-ignore
                            variants={chipVariants}
                            whileHover="hover"
                            whileTap="tap"
                            animate={filterStatus === status ? "selected" : "initial"}>
                            <Chip
                                label={`${config.label} (${statusCounts[status] || 0})`}
                                variant={filterStatus === status ? 'filled' : 'outlined'}
                                color={filterStatus === status ? 'primary' : 'default'}
                                icon={<Box sx={{ color: config.color }}>{config.icon}</Box>}
                                onClick={() => setFilterStatus(status as FileUpload['status'])}
                                size="small"
                            />
                        </motion.div>
                    ))}

                    {filterStatus !== 'all' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}>
                            <Tooltip title="Clear filter">
                                <IconButton size="small" onClick={clearFilter}>
                                    <X size={16} />
                                </IconButton>
                            </Tooltip>
                        </motion.div>
                    )}
                </Stack>

                {/* Uploads List */}
                <AnimatePresence mode="popLayout">
                    <Stack
                        flex={1}
                        component={motion.div}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        key={`uploads-${filterStatus}-${sortEnabled}`}>
                        <Stack spacing={2}>
                            {displayUploads.length > 0 ? (
                                displayUploads.map((upload, i) => (
                                    <motion.div
                                        key={upload.id}
                                        // @ts-ignore
                                        variants={itemVariants}
                                        layout
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                                        <UploadView upload={upload} />
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 4,
                                            textAlign: 'center',
                                            borderStyle: 'dashed',
                                            backgroundColor: alpha(theme.palette.background.default, 0.5)
                                        }}>
                                        <motion.div
                                            animate={{ y: [0, -5, 0] }}
                                            transition={{ duration: 2, repeat: Infinity }}>
                                            <UploadCloud size={32} style={{ marginBottom: 16, opacity: 0.5 }} />
                                        </motion.div>
                                        <Typography variant="body2" color="text.secondary">
                                            {filterStatus === 'all'
                                                ? 'No uploads found'
                                                : `No ${statusConfig[filterStatus]?.label.toLowerCase()} uploads`
                                            }
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            )}
                        </Stack>
                    </Stack>
                </AnimatePresence>

                {/* Summary Footer */}
                {uploads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}>
                        <Box mt={3} pt={2} borderTop={`1px solid ${alpha(theme.palette.divider, 0.1)}`}>
                            <Typography variant="caption" color="text.secondary">
                                Showing {displayUploads.length} of {uploads.length} uploads
                                {filterStatus !== 'all' && ` (filtered by ${statusConfig[filterStatus]?.label.toLowerCase()})`}
                            </Typography>
                        </Box>
                    </motion.div>
                )}
            </Stack>
        </Stack>
    );
}