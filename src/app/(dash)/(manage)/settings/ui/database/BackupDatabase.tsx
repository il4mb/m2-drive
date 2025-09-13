'use client'

import { Task } from '@/entities/Task';
import { formatLocaleDate } from '@/libs/utils';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import {
    Box,
    Chip,
    Stack,
    Typography,
    Button,
    IconButton,
    Tooltip,
    LinearProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Paper,
    Divider
} from '@mui/material';
import {
    DatabaseBackup,
    Download,
    MoreVertical,
    CheckCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    Calendar
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPresignUrl } from '@/hooks/usePresignUrl';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { useMyPermission } from '@/hooks/useMyPermission';
import PermissionSuspense from '@/components/PermissionSuspense';

export interface BackupDatabaseProps {
    children?: ReactNode;
}

export default function BackupDatabase({ }: BackupDatabaseProps) {

    const canManage = useMyPermission('can-manage-db');
    const [total, setTotal] = useState(0);
    const [backups, setBackups] = useState<Task<{ objectKey: string }>[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<Record<string, boolean>>({});
    const [selectedBackup, setSelectedBackup] = useState<Task<{ objectKey: string }> | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    useEffect(() => {
        return onSnapshot(
            getMany("task")
                .where("type", "==", "backup-database")
                .orderBy("createdAt", "DESC"),
            (data) => {
                setTotal(data.total);
                setBackups(data.rows as any);
                setLoading(false);
            }
        );
    }, []);

    const handleDownloadBackup = async (backup: Task<{ objectKey: string }>) => {
        try {

            if (!canManage) throw new Error("Permission not granted!");
            if (downloading[backup.id]) return;
            setDownloading(prev => ({ ...prev, [backup.id]: true }));

            if (!backup.payload.objectKey) {
                throw new Error("Backup object key doesn't exist!");
            }

            const url = await getPresignUrl(backup.payload.objectKey);
            if (!url) {
                throw new Error("Failed to get download url, object may not be found!");
            }

            enqueueSnackbar("Downloading database...", {
                variant: "success",
                action: CloseSnackbar,
            });

            // Push download automatically
            const link = document.createElement("a");
            link.href = url;
            link.download = backup.payload.objectKey.split("/").pop() || "backup.sqlite";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error: any) {
            enqueueSnackbar(error.message || "Failed to download database", {
                variant: "error",
                action: CloseSnackbar,
            });
        } finally {
            setDownloading(prev => ({ ...prev, [backup.id]: false }));
        }
    };


    const handleViewDetails = (backup: Task<{ objectKey: string }>) => {
        setSelectedBackup(backup);
        setDetailDialogOpen(true);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} color="#4caf50" />;
            case 'failed': return <AlertCircle size={16} color="#f44336" />;
            case 'running': return <RefreshCw size={16} className="animate-spin" />;
            default: return <Clock size={16} color="#ff9800" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'failed': return 'error';
            case 'running': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{
                        p: 1,
                        bgcolor: 'primary.main',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                    }}>
                        <DatabaseBackup size={24} />
                    </Box>
                    <Stack>
                        <Typography fontSize={24} fontWeight={700}>
                            Database Backups
                        </Typography>
                        <Typography variant='body2' sx={{ opacity: 0.9 }}>
                            Protect your data with regular backups
                        </Typography>
                    </Stack>
                </Stack>
            </Stack>

            {/* Backup List */}
            <Stack spacing={2}>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0.2}>
                        <Typography variant="h6" fontWeight={600}>
                            Recent Backups
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                            Backup scheduled at
                        </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {backups.length} of {total}
                    </Typography>
                </Stack>

                <Divider />

                {loading ? (
                    <Stack alignItems="center" py={4}>
                        <RefreshCw size={32} className="animate-spin" />
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Loading backups...
                        </Typography>
                    </Stack>
                ) : backups.length === 0 ? (
                    <Alert severity="info" icon={<DatabaseBackup />}>
                        No backups found. Create your first backup to get started.
                    </Alert>
                ) : (
                    <Stack spacing={2}>
                        <AnimatePresence>
                            {backups.map((backup, i) => (
                                <motion.div
                                    key={backup.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: 0.2 * i }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Stack spacing={0.5}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography fontWeight={600}>
                                                            Backup #{backup.id.slice(-6)}
                                                        </Typography>
                                                        <Chip
                                                            icon={getStatusIcon(backup.status)}
                                                            label={backup.status.toUpperCase()}
                                                            size="small"
                                                            color={getStatusColor(backup.status) as any}
                                                            variant="outlined"
                                                        />
                                                    </Stack>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <Calendar size={14} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                {formatLocaleDate(backup.createdAt)}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                </Stack>
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Download">
                                                        <IconButton
                                                            loading={downloading[backup.id]}
                                                            size="small"
                                                            onClick={() => handleDownloadBackup(backup)}
                                                            disabled={backup.status !== 'completed'}>
                                                            <Download size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="View details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDetails(backup)}>
                                                            <MoreVertical size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Stack>
                                            {backup.status === "processing" && (<LinearProgress />)}
                                            {backup.error && (
                                                <Alert severity="error" sx={{ py: 1 }}>
                                                    <Typography variant="body2">
                                                        {backup.error}
                                                    </Typography>
                                                </Alert>
                                            )}
                                        </Stack>
                                    </Paper>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </Stack>
                )}
            </Stack>

            {/* Backup Details Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="sm"
                fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <DatabaseBackup size={20} />
                        <Typography fontWeight={600}>
                            Backup Details
                        </Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedBackup && (
                        <Stack spacing={2} mt={1}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        ID
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {selectedBackup.id}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Chip
                                        icon={getStatusIcon(selectedBackup.status)}
                                        label={selectedBackup.status.toUpperCase()}
                                        size="small"
                                        color={getStatusColor(selectedBackup.status) as any}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Created
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {formatLocaleDate(selectedBackup.createdAt)}
                                    </Typography>
                                </Grid>
                            </Grid>
                            {selectedBackup.error && (
                                <Alert severity="error">
                                    <Typography variant="body2">
                                        Error: {selectedBackup.error}
                                    </Typography>
                                </Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
                    {selectedBackup?.status === 'completed' && (
                        <Button
                            variant="contained"
                            startIcon={<Download size={16} />}
                            onClick={() => handleDownloadBackup(selectedBackup)}>
                            Download
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Stack>
    );
}