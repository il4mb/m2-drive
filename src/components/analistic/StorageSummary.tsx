'use client'

import { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Stack,
    CircularProgress,
    Alert,
    Chip,
    Tooltip,
    useTheme,
    useMediaQuery,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Button,
    AlertTitle
} from '@mui/material';
import {
    Database,
    HardDrive,
    Trash2,
    Package,
    PieChart as PieChartIcon,
    BarChart3,
    Clock,
    File,
    BrushCleaning
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    ComposedChart,
    Line,
    CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { getOne } from '@/libs/websocket/query';
import { formatFileSize, formatDateFromEpoch, formatDateFromISO, getDurationToMidnight } from '@/libs/utils';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '../ui/CloseSnackbar';
import Storage from '@/entities/Storage';
import { useCountdownToMidnight } from '@/hooks/useCountdownToMidnight';
import Link from 'next/link';


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

// Color palette
const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function StorageSummary() {

    const [showInfo, setShowInfo] = useState(true);

    const [data, setData] = useState<Storage | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string>();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

    const shoundShowCleaner = useMemo(() => {
        if (!data) return false;

        // cek multipart upload lebih dari 7 hari
        const hasOldUpload = data?.multipart?.uploads?.some(e => {
            if (!e.initiated) return false;
            const initiatedDate = new Date(e.initiated);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return initiatedDate < sevenDaysAgo;
        });

        // cek ada garbage
        const hasGarbage = (data?.garbageItems?.length || 0) > 0;

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
            { name: 'Committed', value: data.committed.size, color: CHART_COLORS[0] },
            { name: 'Versions', value: data.versions.size, color: CHART_COLORS[2] },
            { name: 'Multipart', value: data.multipart.count * 5000000, color: CHART_COLORS[4] }, // Estimate 5MB per upload
            { name: 'Garbage', value: garbageSize, color: CHART_COLORS[3] }
        ];

        // Prepare data for file type breakdown
        const fileTypeBreakdown = [
            { name: 'Committed', count: data.committed.count, size: data.committed.size },
            { name: 'Versions', count: data.versions.count, size: data.versions.size },
            { name: 'Multipart', count: data.multipart.count, size: data.multipart.count * 5000000 }
        ];

        // Top garbage items
        const topGarbageItems = [...data.garbageItems]
            .sort((a, b) => b.size - a.size)
            .slice(0, 5)
            .map((item, index) => ({
                name: item.key.length > 20 ? `${item.key.substring(0, 20)}...` : item.key,
                fullName: item.key,
                size: item.size,
                formattedSize: formatFileSize(item.size),
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));

        return {
            ...data,
            garbageSize,
            usefulSize,
            usefulPercentage,
            garbagePercentage,
            storageDistribution,
            fileTypeBreakdown,
            topGarbageItems
        };
    }, [data]);


    const scanStorage = async () => {
        try {
            const result = await invokeFunction("scanStorage");
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Task untuk scan storage sudah dikirim...", {
                variant: "success",
                action: CloseSnackbar
            })
        } catch (error: any) {
            enqueueSnackbar(error.message || "Gagal memulai task!", {
                variant: "error",
                action: CloseSnackbar
            })
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                Error loading storage data: {error}
            </Alert>
        );
    }

    if (!storageData) {
        return (
            <Alert variant='filled' severity='warning' sx={{ mb: 1 }}>
                <AlertTitle>Peringatan!</AlertTitle>
                <Stack direction={"row"} flexWrap={"wrap"} flex={1} width={"100%"}>
                    <Typography>
                        Ringkasan penggunaan penyimpanan belum tersedia, data akan diperbarui secara otomatis.
                        <br />
                        Anda dapat melakukanya secarang manual dengan menekan tombol <strong>Scan Sekarang!</strong> dibawah ini.
                    </Typography>
                    <Button onClick={scanStorage} color='warning' sx={{ ml: 'auto', mt: 2 }} size='small' variant='outlined'>
                        Scan Sekarang!
                    </Button>
                </Stack>
            </Alert>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible">

            {showInfo && (
                <Alert variant='outlined' severity='info' sx={{ mb: 1 }} onClose={() => setShowInfo(false)}>
                    <AlertTitle>Informasi</AlertTitle>
                    <Stack direction={"row"} flexWrap={"wrap"} flex={1} width={"100%"}>
                        Ringkasan penggunaan penyimpanan tidak real-time, data diperbarui secara otomatis 1x 24jam.
                        <Button onClick={scanStorage} color='info' sx={{ ml: 'auto', mt: 0.4 }} size='small' variant='outlined'>
                            Scan Sekarang!
                        </Button>
                    </Stack>
                </Alert>
            )}

            {shoundShowCleaner && (
                <CountdownCleaner />
            )}

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card
                            sx={{
                                height: '100%',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                color: 'white',
                                borderRadius: 2
                            }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                    <Database size={20} />
                                    <Typography variant="h6" fontWeight={600}>
                                        Total Storage
                                    </Typography>
                                </Stack>
                                <Typography variant="h4" fontWeight={700}>
                                    {formatFileSize(storageData.size)}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                    Updated: {formatDateFromEpoch(storageData.createdAt)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                    <HardDrive size={20} color={theme.palette.success.main} />
                                    <Typography variant="h6" fontWeight={600}>
                                        Useful Data
                                    </Typography>
                                </Stack>
                                <Typography variant="h4" fontWeight={700} color="success.main">
                                    {formatFileSize(storageData.usefulSize)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {storageData.usefulPercentage.toFixed(1)}% of total
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                    <Trash2 size={20} color={theme.palette.error.main} />
                                    <Typography variant="h6" fontWeight={600}>
                                        Garbage
                                    </Typography>
                                </Stack>
                                <Typography variant="h4" fontWeight={700} color="error.main">
                                    {formatFileSize(storageData.garbageSize)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {storageData.garbageItems.length} items • {storageData.garbagePercentage.toFixed(1)}%
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                    <Package size={20} color={theme.palette.info.main} />
                                    <Typography variant="h6" fontWeight={600}>
                                        Files Count
                                    </Typography>
                                </Stack>
                                <Typography variant="h4" fontWeight={700} color="info.main">
                                    {storageData.committed.count + storageData.versions.count + storageData.multipart.count}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {storageData.multipart.count} multipart uploads
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3}>
                {/* Storage Distribution Pie Chart */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <PieChartIcon size={18} color={theme.palette.primary.main} />
                                <Typography variant="h6" fontWeight={600}>
                                    Storage Distribution
                                </Typography>
                            </Stack>

                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie
                                        data={storageData.storageDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={isMobile ? 60 : 80}
                                        outerRadius={isMobile ? 90 : 110}
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
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </motion.div>
                </Grid>

                {/* File Type Breakdown */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <BarChart3 size={18} color={theme.palette.secondary.main} />
                                <Typography variant="h6" fontWeight={600}>
                                    File Type Breakdown
                                </Typography>
                            </Stack>

                            <ResponsiveContainer width="100%" height="90%">
                                <ComposedChart
                                    data={storageData.fileTypeBreakdown}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <RechartsTooltip
                                        formatter={(value, name) => {
                                            if (name === 'size') return [formatFileSize(Number(value)), 'Size'];
                                            return [value, 'Count'];
                                        }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="count" fill={CHART_COLORS[0]} name="File Count" />
                                    <Line yAxisId="right" dataKey="size" stroke={CHART_COLORS[1]} name="Total Size" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Multipart Uploads Section */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <Clock size={18} color={theme.palette.warning.main} />
                                <Typography variant="h6" fontWeight={600}>
                                    Multipart Uploads
                                </Typography>
                                <Chip
                                    label={storageData.multipart.count}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                />
                            </Stack>

                            {storageData.multipart.uploads.length > 0 ? (
                                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {storageData.multipart.uploads.map((upload, index) => (
                                        <ListItem key={index} divider>
                                            <ListItemIcon>
                                                <File size={22} />
                                            </ListItemIcon>
                                            <ListItemText
                                                sx={{ ml: 1 }}
                                                primary={
                                                    <Tooltip title={upload.key}>
                                                        <Typography variant="body2" noWrap sx={{ maxWidth: isMobile ? 150 : 250 }}>
                                                            {upload.key}
                                                        </Typography>
                                                    </Tooltip>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        Initiated: {formatDateFromISO(upload.initiated)}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                                    No active multipart uploads
                                </Typography>
                            )}
                        </Paper>
                    </motion.div>
                </Grid>

                {/* Garbage Items */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <Trash2 size={18} color={theme.palette.error.main} />
                                <Typography variant="h6" fontWeight={600}>
                                    Largest Garbage Items
                                </Typography>
                                <Chip
                                    label={`${storageData.garbageItems.length} total`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                />
                            </Stack>

                            {storageData.topGarbageItems.length > 0 ? (
                                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {storageData.topGarbageItems.map((item, index) => (
                                        <ListItem key={index} divider>
                                            <ListItemIcon>
                                                <Box
                                                    sx={{
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: '50%',
                                                        backgroundColor: item.color
                                                    }}
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                sx={{ ml: 1 }}
                                                primary={
                                                    <Tooltip title={item.fullName}>
                                                        <Typography variant="body2" noWrap sx={{ maxWidth: isMobile ? 150 : 250 }}>
                                                            {item.name}
                                                        </Typography>
                                                    </Tooltip>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.formattedSize}
                                                    </Typography>
                                                }
                                            />
                                            <Chip
                                                label={item.formattedSize}
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                                    No garbage items found
                                </Typography>
                            )}
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>
        </motion.div>
    );
}



function CountdownCleaner() {
    const { hours, minutes, seconds } = useCountdownToMidnight();

    return (
        <Alert variant={'outlined'} severity={'warning'} icon={<BrushCleaning size={18} />} sx={{ mb: 2 }}>
            <AlertTitle>Pengingat!</AlertTitle>
            <Stack direction={"row"} flexWrap={"wrap"} flex={1} width={"100%"}>
                Pembersihan otomatis akan berjalan dalam {hours} jam {minutes} menit {seconds} detik
                <Button color={'warning'} sx={{ ml: 'auto', mt: 0.4 }} size='small' variant='outlined' LinkComponent={Link} href='/drive-metrics/cleaner'>
                    Bersihkan Sekarang!
                </Button>
            </Stack>
        </Alert>
    );
}
