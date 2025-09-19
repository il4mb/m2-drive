'use client'

import Container from '@/components/Container';
import StickyHeader from '@/components/navigation/StickyHeader';
import PermissionSuspense from '@/components/PermissionSuspense';
import {
    Button,
    Paper,
    Stack,
    Typography,
    Box,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tooltip,
    IconButton,
    Collapse,
    useTheme,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    BrushCleaning,
    Trash2,
    X,
    CheckCircle,
    AlertTriangle,
    Info,
    ChevronDown,
    ChevronUp,
    Clock,
    File
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts';
import { formatDateFromEpoch, formatDateFromISO, formatFileSize } from '@/libs/utils';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { getOne } from '@/libs/websocket/query';
import Storage from '@/entities/Storage';
import { useOption } from '@/hooks/useOption';
import { CustomTooltip } from '@/components/CustomTooltip';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { Task } from '@/entities/Task';

// Color palette
const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.5
        }
    }
};

// Task status mapping
const TASK_STATUS = {
    pending: { label: 'Pending', color: 'warning' },
    processing: { label: 'Processing', color: 'info' },
    completed: { label: 'Completed', color: 'success' },
    failed: { label: 'Failed', color: 'error' }
};

export default function DriveCleanerPage() {

    const [showInfo, setShowInfo] = useState(true);
    const [data, setData] = useState<Storage | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string>();
    const [cleanDialogOpen, setCleanDialogOpen] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [cleanSuccess, setCleanSuccess] = useState(false);
    const [autoCleanEnabled, setAutoCleanEnabled] = useOption('auto-clean-drive', true);
    const [task, setTask] = useState<Task | null>(null);

    const theme = useTheme();

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        setLoading(true);

        return onSnapshot(
            getOne("storage").orderBy("createdAt", "DESC"),
            (storage) => {
                setData(storage);
                setLoading(false);
            },
            {
                onError: (error) => {
                    setError(error.message || 'Failed to load storage data');
                    setLoading(false);
                }
            }
        );
    }, [mounted]);


    useEffect(() => {
        if (!mounted) return;
        return onSnapshot(
            getOne("task")
                .where("type", "==", "clean-storage")
                .orderBy("createdAt", "DESC"),
            (task) => {
                setTask(task);
            }
        )
    }, [mounted, cleaning]);

    const shouldShowCleaner = useMemo(() => {
        if (!data) return false;

        // Check multipart uploads older than 7 days
        const hasOldUpload = data.multipart.uploads.some(e => {
            if (!e.initiated) return false;
            const initiatedDate = new Date(e.initiated);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return initiatedDate < sevenDaysAgo;
        });

        // Check if there's garbage
        const hasGarbage = data.garbageItems.length > 0;

        return hasOldUpload || hasGarbage;
    }, [data]);

    // Calculate derived data
    const storageData = useMemo(() => {
        if (!data) return null;

        const garbageSize = data.garbageItems.reduce((sum, item) => sum + item.size, 0);
        const usefulSize = data.size - garbageSize;
        const usefulPercentage = data.size > 0 ? (usefulSize / data.size) * 100 : 0;
        const garbagePercentage = data.size > 0 ? (garbageSize / data.size) * 100 : 0;

        // Prepare data for storage distribution chart
        const storageDistribution = [
            { name: 'Useful Data', value: usefulSize, color: CHART_COLORS[1] },
            { name: 'Garbage', value: garbageSize, color: CHART_COLORS[3] }
        ];

        // Old multipart uploads (older than 7 days)
        const oldMultipartUploads = data.multipart.uploads.filter(upload => {
            if (!upload.initiated) return false;
            const initiatedDate = new Date(upload.initiated);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return initiatedDate < sevenDaysAgo;
        });

        return {
            ...data,
            garbageSize,
            usefulSize,
            usefulPercentage,
            garbagePercentage,
            storageDistribution,
            oldMultipartUploads
        };
    }, [data]);

    const handleClean = async () => {
        setCleaning(true);
        try {
            const result = await invokeFunction("cleanStorage");
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Cleaning task started successfully!", {
                variant: "success",
                action: CloseSnackbar
            });
            setCleanDialogOpen(false);
        } catch (error: any) {
            setCleaning(false);
            enqueueSnackbar(error.message || "Failed to start cleaning task", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    };

    const isTaskActive = Boolean(task && (task.status === 'pending' || task.status === 'processing'));
    const taskStatusInfo = task ? TASK_STATUS[task.status as keyof typeof TASK_STATUS] : null;

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <PermissionSuspense permission={"can-manage-drive-root"}>
            <Container maxWidth={"lg"} scrollable>
                <StickyHeader canGoBack>
                    <Stack direction={"row"} spacing={1} alignItems={"center"} color={"warning.main"}>
                        <BrushCleaning size={22} color='currentColor' />
                        <Typography fontSize={22} fontWeight={700}>
                            Drive Cleaner
                        </Typography>
                        {isTaskActive && (
                            <Chip
                                label={taskStatusInfo?.label || 'Processing'}
                                color={taskStatusInfo?.color as any || 'info'}
                                size="small"
                                icon={<CircularProgress size={14} />}
                            />
                        )}
                    </Stack>
                </StickyHeader>

                <AnimatePresence>
                    {cleanSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}>
                            <Alert
                                severity="success"
                                icon={<CheckCircle size={20} />}
                                sx={{ mb: 2 }}
                                action={
                                    <IconButton
                                        aria-label="close"
                                        color="inherit"
                                        size="small"
                                        onClick={() => setCleanSuccess(false)}>
                                        <X size={16} />
                                    </IconButton>
                                }>
                                Drive cleaned successfully! Reclaimed {formatFileSize(storageData?.garbageSize || 0)} of space.
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Task Progress Indicator */}
                {isTaskActive && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2, mb: 3, boxShadow: 2, bgcolor: 'info.light' }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <CircularProgress size={24} />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        Cleaning in Progress
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {task?.status === 'processing'
                                            ? 'Currently cleaning your drive...'
                                            : 'Task is queued and will start soon'}
                                    </Typography>
                                    {task?.createdAt && (
                                        <Typography variant="caption" color="text.secondary">
                                            Started: {formatDateFromEpoch(task.createdAt)}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Paper>
                    </motion.div>
                )}

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible">


                    {/* Storage Visualization */}
                    {storageData && (
                        <motion.div variants={itemVariants}>
                            <Paper sx={{ p: 3, borderRadius: 2, mb: 3, background: 'transparent' }}>
                                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                                    <Info size={18} color={theme.palette.info.main} />
                                    <Typography variant="h6" fontWeight={600}>
                                        Storage Analysis
                                    </Typography>
                                    <Chip
                                        label={shouldShowCleaner ? "Action Recommended" : "Healthy"}
                                        color={shouldShowCleaner ? "warning" : "success"}
                                        size="small"
                                    />
                                </Stack>

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Box sx={{ height: 200 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={storageData.storageDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        label={({ name, percent }) =>
                                                            // @ts-ignore
                                                            `${name}: ${(percent * 100).toFixed(0)}%`
                                                        }>
                                                        {storageData.storageDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        formatter={(value) => [formatFileSize(Number(value)), 'Size']}
                                                        content={<CustomTooltip />}
                                                    />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack spacing={2}>
                                            <Box>
                                                <Typography variant="body2" fontWeight={500} gutterBottom>
                                                    Storage Efficiency
                                                </Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={storageData.usefulPercentage}
                                                    color="success"
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {storageData.usefulPercentage.toFixed(1)}% useful data
                                                </Typography>
                                            </Box>

                                            {storageData.garbageSize > 0 && (
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500} gutterBottom>
                                                        Reclaimable Space
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={storageData.garbagePercentage}
                                                        color="error"
                                                        sx={{ height: 8, borderRadius: 4 }}
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatFileSize(storageData.garbageSize)} can be freed
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </motion.div>
                    )}

                    {/* Cleaner Action Section */}
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2, background: 'transparent' }}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="h6" fontWeight={600} gutterBottom>
                                        Cleanup Actions
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Remove unnecessary files to free up storage space and improve system performance
                                    </Typography>
                                </Box>

                                <Button
                                    color={'error'}
                                    size={'large'}
                                    variant={'contained'}
                                    onClick={() => setCleanDialogOpen(true)}
                                    disabled={(!shouldShowCleaner || isTaskActive)}
                                    startIcon={isTaskActive ? <CircularProgress size={20} /> : <Trash2 size={20} />}
                                    sx={{
                                        py: 2,
                                        borderRadius: 2,
                                        fontWeight: 600,
                                        fontSize: '1.1rem'
                                    }}>
                                    {isTaskActive ? 'Cleaning...' : 'Clean Now'}
                                </Button>

                                {!shouldShowCleaner && (
                                    <Alert severity="success" icon={<CheckCircle size={20} />}>
                                        Your drive is already clean! No unnecessary files found.
                                    </Alert>
                                )}

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autoCleanEnabled}
                                            onChange={(e) => setAutoCleanEnabled(e.target.checked)}
                                            color="primary"
                                            disabled={isTaskActive}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>
                                                Automatic Cleaning
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Automatically remove old files weekly
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Stack>
                        </Paper>
                    </motion.div>

                    {/* Detailed Information */}
                    {storageData && (storageData.garbageItems.length > 0 || storageData.oldMultipartUploads.length > 0) && (
                        <motion.div variants={itemVariants}>
                            <Paper sx={{ p: 3, borderRadius: 2, mt: 3, background: 'transparent' }}>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => setShowInfo(!showInfo)}>
                                    {showInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    <Typography variant="h6" fontWeight={600}>
                                        Details
                                    </Typography>
                                    <Chip
                                        label={`${storageData.garbageItems.length + storageData.oldMultipartUploads.length} items`}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Stack>

                                <Collapse in={showInfo}>
                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                        {storageData.garbageItems.length > 0 && (
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                    Garbage Files ({storageData.garbageItems.length})
                                                </Typography>
                                                <List dense>
                                                    {storageData.garbageItems.map((item, index) => (
                                                        <ListItem key={index} divider>
                                                            <ListItemIcon>
                                                                <File size={16} color={theme.palette.error.main} />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                sx={{ ml: 1 }}
                                                                primary={
                                                                    <Tooltip title={item.key}>
                                                                        <Typography variant="body2" noWrap>
                                                                            {item.key}
                                                                        </Typography>
                                                                    </Tooltip>
                                                                }
                                                                secondary={formatFileSize(item.size)}
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Box>
                                        )}

                                        {storageData.oldMultipartUploads.length > 0 && (
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                    Old Multipart Uploads ({storageData.oldMultipartUploads.length})
                                                </Typography>
                                                <List dense>
                                                    {storageData.oldMultipartUploads.map((upload, index) => (
                                                        <ListItem key={index} divider>
                                                            <ListItemIcon>
                                                                <Clock size={16} color={theme.palette.warning.main} />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                sx={{ ml: 1 }}
                                                                primary={
                                                                    <Tooltip title={upload.key}>
                                                                        <Typography variant="body2" noWrap>
                                                                            {upload.key}
                                                                        </Typography>
                                                                    </Tooltip>
                                                                }
                                                                secondary={
                                                                    upload.initiated ? `Initiated: ${formatDateFromISO(upload.initiated)}` : 'Unknown date'
                                                                }
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Box>
                                        )}
                                    </Stack>
                                </Collapse>
                            </Paper>
                        </motion.div>
                    )}
                </motion.div>

                {/* Clean Confirmation Dialog */}
                <Dialog
                    open={cleanDialogOpen}
                    onClose={() => !cleaning && setCleanDialogOpen(false)}
                    aria-labelledby="clean-dialog-title">
                    <DialogTitle id="clean-dialog-title">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <AlertTriangle size={20} color={theme.palette.warning.main} />
                            <Typography fontWeight={600}>Confirm Cleanup</Typography>
                        </Stack>
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to clean {formatFileSize(storageData?.garbageSize || 0)} of unnecessary files?
                            This action cannot be undone.
                        </DialogContentText>
                        {storageData && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" fontWeight={500}>
                                    Items to be removed:
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    • {storageData.garbageItems.length} garbage files
                                    {storageData.oldMultipartUploads.length > 0 && (
                                        <>{` • ${storageData.oldMultipartUploads.length} old multipart uploads`}</>
                                    )}
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setCleanDialogOpen(false)}
                            color="inherit"
                            disabled={cleaning}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleClean}
                            color="error"
                            variant="contained"
                            disabled={cleaning}
                            startIcon={cleaning ? <CircularProgress size={16} /> : <Trash2 size={16} />}>
                            {cleaning ? 'Starting...' : 'Clean Now'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </PermissionSuspense>
    );
}