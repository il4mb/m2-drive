import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { ReactNode, useEffect, useState } from 'react';
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
    LinearProgress,
    alpha
} from '@mui/material';
import {
    Database,
    HardDrive,
    Trash2,
    Package,
    Archive,
    Download,
    Upload,
    Server,
    PieChartIcon,
    BarChart3
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { formatFileSize } from '@/libs/utils';

type SummaryData = {
    totalStorageSize: number;
    totalGarbage: number;
    garbageSize: number;
    garbageItems: {
        key: string;
        size: number;
    }[];
}

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

export interface StorageSummaryProps {
    children?: ReactNode;
}

export default function StorageSummary2({ children }: StorageSummaryProps) {
    const [data, setData] = useState<SummaryData>();
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string>();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        setMounted(true);
    }, [])

    useEffect(() => {
        if (loading || !mounted) return;
        setLoading(true);
        invokeFunction("getStorageSummary")
            .then((result) => {
                if (!result.success) {
                    setError(result.error);
                } else {
                    setData(result.data);
                }
            })
            .catch(err => {
                setError(err.message || 'Failed to load storage summary');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [mounted]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                Error loading storage summary: {error}
            </Alert>
        );
    }

    if (!data) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                No storage data available
            </Alert>
        );
    }

    // Calculate useful storage
    const usefulStorage = data.totalStorageSize - data.garbageSize;
    const usefulPercentage = data.totalStorageSize > 0
        ? (usefulStorage / data.totalStorageSize) * 100
        : 0;
    const garbagePercentage = data.totalStorageSize > 0
        ? (data.garbageSize / data.totalStorageSize) * 100
        : 0;

    // Prepare data for charts
    const storagePieData = [
        { name: 'Useful Storage', value: usefulStorage, color: CHART_COLORS[1] },
        { name: 'Garbage', value: data.garbageSize, color: CHART_COLORS[3] }
    ];

    // Prepare garbage items for bar chart (top 10 largest)
    const topGarbageItems = [...data.garbageItems]
        .sort((a, b) => b.size - a.size)
        .slice(0, 7)
        .map((item, index) => ({
            name: item.key.length > 20 ? `${item.key.substring(0, 20)}...` : item.key,
            fullName: item.key,
            size: item.size,
            formattedSize: formatFileSize(item.size),
            color: CHART_COLORS[index % CHART_COLORS.length]
        }));

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            {children}

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
                                    {formatFileSize(data.totalStorageSize)}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                    Overall storage usage
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
                                    {formatFileSize(usefulStorage)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {usefulPercentage.toFixed(1)}% of total
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
                                    {formatFileSize(data.garbageSize)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {data.totalGarbage} items • {garbagePercentage.toFixed(1)}%
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
                                        Efficiency
                                    </Typography>
                                </Stack>
                                <Typography variant="h4" fontWeight={700} color="info.main">
                                    {usefulPercentage.toFixed(1)}%
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={usefulPercentage}
                                        color="info"
                                        sx={{ height: 6, borderRadius: 3 }}
                                    />
                                </Box>
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
                                        data={storagePieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={isMobile ? 60 : 80}
                                        outerRadius={isMobile ? 90 : 110}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            // @ts-ignore
                                            `${name}: ${(percent * 100).toFixed(0)}%`
                                        }
                                        labelLine={false}>
                                        {storagePieData.map((entry, index) => (
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

                {/* Largest Garbage Items Bar Chart */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <BarChart3 size={18} color={theme.palette.error.main} />
                                <Typography variant="h6" fontWeight={600}>
                                    Largest Garbage Items
                                </Typography>
                                <Chip
                                    label={`Top ${topGarbageItems.length}`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                />
                            </Stack>

                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart
                                    data={topGarbageItems}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: isMobile ? 20 : 40, bottom: 5 }}
                                >
                                    <XAxis
                                        type="number"
                                        tickFormatter={(value) => formatFileSize(value).replace(/[a-zA-Z]+$/, '')}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={isMobile ? 80 : 100}
                                        tick={{ fontSize: isMobile ? 10 : 12 }}
                                    />
                                    <RechartsTooltip
                                        formatter={(value) => [formatFileSize(Number(value)), 'Size']}
                                        labelFormatter={(value, payload) =>
                                            payload[0]?.payload.fullName || value
                                        }
                                    />
                                    <Bar dataKey="size">
                                        {topGarbageItems.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Garbage Items List */}
            {data.garbageItems.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <Archive size={18} color={theme.palette.text.secondary} />
                            <Typography variant="h6" fontWeight={600}>
                                Garbage Items Details
                            </Typography>
                            <Chip
                                label={`${data.garbageItems.length} items`}
                                size="small"
                                variant="outlined"
                            />
                        </Stack>

                        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                            {data.garbageItems.map((item, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        p: 1.5,
                                        mb: 1,
                                        borderRadius: 1,
                                        backgroundColor: index % 2 === 0 ? 'action.hover' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Tooltip title={item.key} placement="top-start">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: 'Monospace',
                                                fontSize: '0.8rem',
                                                maxWidth: isMobile ? '150px' : '300px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {item.key}
                                        </Typography>
                                    </Tooltip>
                                    <Chip
                                        label={formatFileSize(item.size)}
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </motion.div>
            )}
        </motion.div>
    );
}