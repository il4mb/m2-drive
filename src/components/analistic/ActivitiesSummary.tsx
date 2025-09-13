'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
    Chip,
    Stack,
    CircularProgress,
    Alert,
    Avatar
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    TooltipProps
} from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { ChartColumnStacked, TabletSmartphone, TrendingUp, Users2 } from 'lucide-react';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { formatNumber } from '@/libs/utils';
import useUser from '@/hooks/useUser';
import UserAvatar from '../ui/UserAvatar';
import { CustomTooltip } from '../CustomTooltip';

// Types for our data
interface ActivitySummary {
    total: number;
    perDay: { date: string; count: number }[];
    byType: { type: string; count: number }[];
    topUsers: { userId: string; name?: string; count: number }[];
    byUserAgent: { agent: string; count: number }[];
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

// Color palettes for charts
const CHART_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#8DD1E1', '#D084D0', '#FF7C7C'
];

interface ActivitySummaryProps {
    data?: ActivitySummary;
    loading?: boolean;
    error?: string;
}

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ }) => {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<ActivitySummary>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    const fetchData = async () => {
        try {
            if (loading) return;
            setLoading(true);

            const result = await invokeFunction("getActivitySummary");
            if (!result.success) throw new Error(result.error);
            setData(result.data);

        } catch (error: any) {
            setError(error.message || "Unknown Error");
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setMounted(true)
    }, [])
    useEffect(() => {
        if (!mounted) return;
        fetchData();
    }, [mounted]);

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
                Error loading activity summary: {error}
            </Alert>
        );
    }

    if (!data) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                No activity data available
            </Alert>
        );
    }

    // Format date for better display
    const formattedPerDay = data.perDay.map(item => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        })
    }));

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card
                            sx={{
                                height: '100%',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                color: 'white'
                            }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <Box component={TrendingUp} sx={{ fontSize: 40, mr: 1 }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {formatNumber(data.total)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Total Activities
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <Box component={ChartColumnStacked} sx={{ fontSize: 40, mr: 1, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {formatNumber(data.byType.length)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Activity Types
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <Box component={Users2} sx={{ fontSize: 40, mr: 1, color: 'secondary.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {formatNumber(data.topUsers.length)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Active Users
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <motion.div variants={itemVariants}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <Box component={TabletSmartphone} sx={{ fontSize: 40, mr: 1, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {formatNumber(data.byUserAgent.length)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Browser Types
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Tabs for different visualizations */}
            <Paper sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} p={1}>
                    {['Daily Activity', 'By Type', 'By User', 'By Browser'].map((tab, index) => (
                        <Chip
                            key={tab}
                            label={tab}
                            onClick={() => setActiveTab(index)}
                            color={activeTab === index ? 'primary' : 'default'}
                            variant={activeTab === index ? 'filled' : 'outlined'}
                        />
                    ))}
                </Stack>
            </Paper>

            {/* Charts */}
            <Grid container spacing={3}>
                {/* Main Chart Area */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <motion.div
                        variants={itemVariants}
                        key={`chart-${activeTab}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}>
                        <Paper sx={{ p: 2, height: isMobile ? 300 : 400 }}>
                            <Typography variant="h6" gutterBottom>
                                {activeTab === 0 && 'Activities Per Day'}
                                {activeTab === 1 && 'Activities By Type'}
                                {activeTab === 2 && 'Top Users'}
                                {activeTab === 3 && 'Browser Distribution'}
                            </Typography>

                            <ResponsiveContainer width="100%" height="100%">
                                {activeTab === 0 ? (
                                    <AreaChart data={formattedPerDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="formattedDate" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" stroke={theme.palette.primary.main} fill={theme.palette.primary.light} />
                                    </AreaChart>
                                ) : activeTab === 1 ? (
                                    <BarChart data={data.byType} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="type" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" fill={theme.palette.primary.main} />
                                    </BarChart>
                                ) : activeTab === 2 ? (
                                    <BarChart
                                        data={data.topUsers}
                                        layout="vertical"
                                        margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            type="category"
                                            dataKey="userId"
                                            width={50}
                                            tick={<CustomYAxisTick />}
                                        />
                                        <Tooltip content={<UserTooltip />} />
                                        <Bar dataKey="count" fill={theme.palette.secondary.main} />
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            data={data.byUserAgent.slice(0, 5)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={isMobile ? 80 : 100}
                                            fill="#8884d8"
                                            dataKey="count"
                                            nameKey="agent"
                                            label={({ agent, count }) => `${agent}: ${count}`}>
                                            {data.byUserAgent.slice(0, 5).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        </Paper>
                    </motion.div>
                </Grid>

                {/* Sidebar with additional info */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: 2, height: isMobile ? 'auto' : 400, overflow: 'auto' }}>
                            <Typography variant="h6" gutterBottom>
                                Details
                            </Typography>

                            {activeTab === 0 && (
                                <>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Activity trends over time. Hover over the chart to see exact counts for each day.
                                    </Typography>
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Latest Activities:
                                        </Typography>
                                        {formattedPerDay.slice(-3).reverse().map((day, index) => (
                                            <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2">{day.formattedDate}</Typography>
                                                <Typography variant="body2" fontWeight="bold">{formatNumber(day.count)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}

                            {activeTab === 1 && (
                                <>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Distribution of activities by type. The most common activity types are shown first.
                                    </Typography>
                                    <Box>
                                        {data.byType.slice(0, 5).map((type, index) => (
                                            <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{ maxWidth: isMobile ? '120px' : '180px' }}>
                                                    {type.type}
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">{formatNumber(type.count)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}

                            {activeTab === 2 && (
                                <>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Most active users based on activity count. User IDs are shown for unnamed users.
                                    </Typography>
                                    <Box>
                                        {data.topUsers.slice(0, 5).map((user, index) => (
                                            <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                                                <UserView userId={user.userId} maxWidth={isMobile ? '120px' : '180px'} />
                                                <Typography variant="body2" fontWeight="bold">{formatNumber(user.count)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}

                            {activeTab === 3 && (
                                <>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Browser and device distribution based on user agent parsing.
                                    </Typography>
                                    <Box>
                                        {data.byUserAgent.slice(0, 5).map((agent, index) => (
                                            <Box key={index} display="flex" alignItems="center" mb={1}>
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                                                        mr: 1
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{ flexGrow: 1, maxWidth: isMobile ? '120px' : '180px' }}>
                                                    {agent.agent}
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">{formatNumber(agent.count)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>
        </motion.div>
    );
};


const UserView = ({ userId, maxWidth }: { userId: string, maxWidth: string }) => {
    const { user } = useUser(userId);
    return (
        <Stack direction={"row"} alignItems={"center"} spacing={1}>
            <UserAvatar user={user} size={22} />
            <Typography
                variant="body2"
                noWrap
                sx={{ maxWidth }}>
                {user?.name || user?.id}
            </Typography>
        </Stack>
    )
}

const CustomYAxisTick: React.FC<any> = ({ x, y, payload }) => {
    const { user } = useUser(payload.value);
    const rawName: string = user?.name || payload.value || "Unknown";

    // Potong jadi max 15 karakter, sisanya "..."
    const name = rawName.length > 15 ? rawName.slice(0, 15) + "…" : rawName;

    return (
        <g transform={`translate(${x},${y})`}>
            {/* Avatar bulat */}
            {user?.meta?.avatar && (
                <image
                    href={user.meta.avatar}
                    x={-50}
                    y={-12}
                    height={24}
                    width={24}
                    clipPath="circle(12px at center)"
                />
            )}
            {/* Nama user di bawah avatar */}
            <text
                x={0}
                y={20}
                textAnchor="middle"
                fill="#555"
                fontSize={12}
                transform="rotate(90)">
                {name}
            </text>
        </g>
    );
};


// @ts-ignore
const UserTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    const { user } = useUser(payload?.[0]?.payload?.userId);
    const count = payload?.[0]?.payload?.count || 0;

    return (
        <AnimatePresence>
            {active && payload && payload.length > 0 && (
                <motion.div
                    key="tooltip"
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ pointerEvents: "none" }}>
                    <Stack
                        sx={(theme) => ({
                            minWidth: 180,
                            borderRadius: 2,
                            boxShadow: "0 0 1px #0007",
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: "blur(2px)",
                            ...theme.applyStyles("dark", {
                                boxShadow: "0 0 1px rgba(117, 117, 117, 0.27)",
                                background: 'rgba(0, 0, 0, 0.7)',
                            })
                        })}>
                        <Stack sx={{ p: 1.5 }}>
                            <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <UserAvatar user={user} size={22} disableIndicator/>
                                    <Typography
                                        variant="body2"
                                        noWrap
                                        sx={{ maxWidth: 150 }}>
                                        {user?.name || user?.id}
                                    </Typography>
                                </Stack>
                                <Typography fontSize={18} fontWeight={600}>
                                    {formatNumber(count)}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                </motion.div>
            )}
        </AnimatePresence>
    );
};




export default ActivitySummary;