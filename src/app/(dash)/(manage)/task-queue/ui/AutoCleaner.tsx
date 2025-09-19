import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { Task } from '@/entities/Task';
import { useOption } from '@/hooks/useOption';
import { formatDateFromEpoch } from '@/libs/utils';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { getOne } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { Box, Button, CircularProgress, FormControlLabel, Paper, Stack, Switch, Typography, useTheme } from '@mui/material';
import { BrushCleaning } from 'lucide-react';
import { motion } from 'motion/react';
import { enqueueSnackbar } from 'notistack';
import { ReactNode, useEffect, useState } from 'react';

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

export interface AutoCleanerProps {
    children?: ReactNode;
}
export default function AutoCleaner({ children }: AutoCleanerProps) {

    const theme = useTheme();
    const [autoCleanEnabled, setAutoCleanEnabled] = useOption('auto-clean-task', true);
    const [task, setTask] = useState<Task | null>();
    const isTaskActive = Boolean(task && (task.status === 'pending' || task.status === 'processing'));


    useEffect(() => {
        return onSnapshot(
            getOne("task").where("type", "==", "clean-task").where("status", "IN", ["pending", "processing"]),
            (task) => {
                setTask(task);
            }
        )
    }, [])

    const handleCleanTasks = async () => {
        try {
            const result = await invokeFunction("cleanUpTask");
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Task berhasil dikirim!", {
                variant: "success",
                action: CloseSnackbar
            })
        } catch (error: any) {
            enqueueSnackbar(error.message || "Failed start task", {
                variant: "error",
                action: CloseSnackbar
            })
        }
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 3, background: 'transparent' }}>

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


            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <BrushCleaning size={20} color={theme.palette.warning.main} />
                <Typography variant="h6" fontWeight={600}>
                    Pembersihan Otomatis
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Bersihkan task yang dibuat 30 hari lalu, Menyegarkan ruang pada database dan tingkatkan performa.
            </Typography>
            <Button
                variant="contained"
                color='error'
                size='large'
                fullWidth
                onClick={handleCleanTasks}
                sx={{ borderRadius: 2, mb: 2 }}>
                Bersihkan Sekarang!
            </Button>

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
                            Hapus task secara otomatis setiap jam 00:00
                        </Typography>
                    </Box>
                }
            />
        </Paper>
    );
}