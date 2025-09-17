'use client'

import Container from '@/components/Container';
import StickyHeader from '@/components/navigation/StickyHeader';
import { getCount } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import {
    Button,
    Paper,
    Stack,
    Switch,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Chip,
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    CircularProgress,
    Tooltip,
    Divider
} from '@mui/material';
import {
    SquareActivity,
    Trash2,
    Settings,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { CustomTooltip } from '@/components/CustomTooltip';
import { currentTime, formatNumber } from '@/libs/utils';
import ConfirmationDialog from '@/components/ui/dialog/ConfirmationDialog';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { useOption } from '@/hooks/useOption';

const RADIAN = Math.PI / 180;
const COLORS = ['#6366F1', '#ff3300ff', '#5f5f5fff'];

// @ts-ignore Custom label renderer for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={12}
            fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export default function page() {

    const [total, setTotal] = useState(0);
    const [notNecessary, setNotNecessary] = useState(0);
    const [oldLength, setOldLength] = useState(0);

    const [autoCleanEnabled, setAutoCleanEnabled] = useOption("auto-clean-activities", true);
    const [cleanSuccess, setCleanSuccess] = useState(false);

    const data = useMemo(() => [
        { name: "Important Activities", value: total - (notNecessary + oldLength) },
        { name: "Non-Essential Activities", value: notNecessary },
        { name: "Old Activities", value: oldLength }
    ], [total, notNecessary, oldLength]);

    const importantPercentage = useMemo(() =>
        total > 0 ? ((total - (notNecessary + oldLength)) / total * 100).toFixed(1) : "0",
        [total, notNecessary, oldLength]
    );

    useEffect(() => {
        return onSnapshot(
            getCount("activity"),
            setTotal
        );
    }, []);

    useEffect(() => {
        return onSnapshot(
            getCount("activity")
                .where("type", "IN", ["CONNECT", "DISCONNECT"]),
            setNotNecessary
        );
    }, []);

    useEffect(() => {
        return onSnapshot(
            getCount("activity")
                .where("type", "NOT IN", ["CONNECT", "DISCONNECT"])
                .where("createdAt", "<", currentTime("-30d")),
            setOldLength
        );
    }, []);

    const handleCleanActivities = async () => {
        try {
            const result = await invokeFunction("cleanNonEssentialActivities");
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Berhasil menghapus aktivitas tidak penting!", {
                variant: "success",
                action: CloseSnackbar
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    return (
        <Container maxWidth={"lg"} scrollable>
            <StickyHeader canGoBack>
                <Stack direction={"row"} alignItems={"center"} spacing={1.5}>
                    <motion.div
                        initial={{ rotate: 0, scale: 0.8 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                        <SquareActivity size={22} />
                    </motion.div>
                    <Typography fontSize={22} fontWeight={600}>
                        Activity Settings
                    </Typography>
                </Stack>
            </StickyHeader>

            <Stack component={Paper} p={[2, 2, 4]} borderRadius={2} boxShadow={2} flex={1}>
                {cleanSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}>
                        <Alert
                            severity="success"
                            icon={<CheckCircle size={20} />}
                            sx={{ mb: 2 }}
                            onClose={() => setCleanSuccess(false)}>
                            Activities cleaned successfully!
                        </Alert>
                    </motion.div>
                )}

                <Grid container spacing={3}>
                    {/* Stats Cards */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                    color: 'white',
                                    borderRadius: 2
                                }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                        <Database size={20} />
                                        <Typography variant="h6" fontWeight={600}>
                                            Total Activities
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight={700}>
                                        {formatNumber(total)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                        All recorded activities in the system
                                    </Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}>
                            <Card sx={{ height: '100%', borderRadius: 2 }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                        <Clock size={20} />
                                        <Typography variant="h6" fontWeight={600}>
                                            Non-Essential
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight={700} color="text.secondary">
                                        {formatNumber(notNecessary)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Connection events that can be cleaned
                                    </Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}>
                            <Card sx={{ height: '100%', borderRadius: 2 }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                        <Settings size={20} />
                                        <Typography variant="h6" fontWeight={600}>
                                            Storage Efficiency
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight={700} color="primary">
                                        {importantPercentage}%
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Useful activities in your database
                                    </Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    {/* Visualization and Actions */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}>
                            <Paper
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                }}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={600} gutterBottom>
                                            Activity Distribution
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Breakdown of essential vs non-essential activities
                                        </Typography>
                                    </Box>

                                    <Box sx={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    // @ts-ignore
                                                    label={renderCustomizedLabel}
                                                    outerRadius={100}
                                                    innerRadius={60}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    animationDuration={500}>
                                                    {data.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${entry.name}`}
                                                            fill={COLORS[index % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    formatter={(value, name) => [`${value} activities`, name]}
                                                    content={<CustomTooltip />}
                                                />
                                                <Legend
                                                    iconType="circle"
                                                    iconSize={10}
                                                    formatter={(value, entry) => (
                                                        <span style={{ color: '#374151', fontSize: '14px' }}>
                                                            {value}
                                                        </span>
                                                    )}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>

                                    <Box>
                                        <Alert severity={"info"} variant='filled' icon={<AlertTriangle size={20} />}>
                                            <Typography variant="body2">
                                                Non-essential activities ({notNecessary}) include connection and disconnection events
                                                that can be safely removed to optimize database performance.
                                            </Typography>
                                        </Alert>
                                    </Box>
                                </Stack>
                            </Paper>
                        </motion.div>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}>
                            <Paper
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Management Actions
                                </Typography>

                                <Stack spacing={3} sx={{ flexGrow: 1 }}>
                                    <Box>
                                        <ConfirmationDialog
                                            type='error'
                                            onConfirm={handleCleanActivities}
                                            title={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <AlertTriangle size={20} color="#EF4444" />
                                                    <Typography fontWeight={600}>Confirm Cleanup</Typography>
                                                </Stack>
                                            }
                                            message={
                                                <>
                                                    Are you sure you want to remove {[`${formatNumber(notNecessary)} non-essential`, `${formatNumber(oldLength)} old`].join(' and ')} activities?
                                                    This action cannot be undone.
                                                </>
                                            }
                                            triggerElement={
                                                <Button
                                                    size="large"
                                                    color="error"
                                                    variant="contained"
                                                    fullWidth
                                                    startIcon={<Trash2 size={20} />}
                                                    disabled={notNecessary === 0}
                                                    sx={{
                                                        py: 1.5,
                                                        borderRadius: 2,
                                                        fontWeight: 600
                                                    }}>
                                                    CLEAN NOW
                                                </Button>
                                            }
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            {notNecessary === 0
                                                ? "No activities to clean"
                                                : `Will remove ${[`${formatNumber(notNecessary)} non-essential`, `${formatNumber(oldLength)} old`].join(' and ')} activities`}
                                        </Typography>
                                    </Box>

                                    <Divider />

                                    <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
                                        <Box>
                                            <Typography fontWeight={600}>Auto Cleaner</Typography>
                                            <Typography variant='caption' color='text.secondary'>
                                                Automatically remove old non-essential activities
                                            </Typography>
                                        </Box>
                                        <Switch
                                            checked={autoCleanEnabled}
                                            onChange={(e) => setAutoCleanEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    </Stack>

                                    {autoCleanEnabled && (
                                        <Box component={Paper} elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                                            <Typography variant="body2" fontWeight={500} gutterBottom>
                                                Auto-clean Settings
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Currently set to remove activities older than 30 days
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        </motion.div>
                    </Grid>
                </Grid>
            </Stack>
        </Container>
    );
}