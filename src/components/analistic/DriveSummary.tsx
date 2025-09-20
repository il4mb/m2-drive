import User from '@/entities/User';
import { useDriveUssageSummary } from '@/hooks/useDriveSummry';
import { useOption } from '@/hooks/useOption';
import { formatFileSize, getFileSizeFromUnit } from '@/libs/utils';
import {
    Box,
    Card,
    Chip,
    Grid,
    LinearProgress,
    Stack,
    Typography,
    useTheme,
    alpha,
    useMediaQuery,
    Skeleton
} from '@mui/material';
import { motion } from 'framer-motion';
import { ReactNode, useMemo, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CustomTooltip } from '../CustomTooltip';
import { AlertCircle, AlertTriangle, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

function truncateLabel(label: string, max: number = 15) {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

export interface DriveSummaryProps {
    children?: ReactNode;
    user?: User;
}

export default function DriveSummary({ user }: DriveSummaryProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const summary = useDriveUssageSummary(user?.id);
    const [driveSizeOptionInString] = useOption(`@drive-size-${user?.meta.role}`, '100gb');
    const [maxUploadSizeOptionInString] = useOption(`@max-upload-${user?.meta.role}`, '100gb');
    const [chartView, setChartView] = useState<'pie' | 'legend'>('pie');

    const mimeData = useMemo(() =>
        Object.entries(summary.data?.mimeBreakdown || {})
            .map(([type, count]) => ({
                type: type.split('/')[1] || type,
                fullType: type,
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8),
        [summary]
    );

    const COLORS = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
        theme.palette.text.secondary,
        theme.palette.grey[500],
    ];

    const totalFiles = summary.data?.fileCount || 0;
    const totalSize = summary.data?.totalSize || 0;
    const folderCount = summary.data?.folderCount || 0;

    // Calculate usage percentage if drive size limit exists
    const driveSizeLimit = driveSizeOptionInString ? getFileSizeFromUnit(driveSizeOptionInString) : null;
    const usagePercentage = driveSizeLimit ? (totalSize / driveSizeLimit) * 100 : 0;

    // Toggle chart view on mobile
    const toggleChartView = () => {
        setChartView(chartView === 'pie' ? 'legend' : 'pie');
    };

    if (summary.loading) {
        return (
            <Stack spacing={3} p={2}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ p: 3 }}>
                            <Skeleton variant="text" width="60%" height={30} />
                            <Stack spacing={2} mt={2}>
                                <Skeleton variant="rounded" height={40} />
                                <Skeleton variant="rounded" height={40} />
                                <Skeleton variant="rounded" height={40} />
                            </Stack>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card sx={{ p: 3, height: 300 }}>
                            <Skeleton variant="text" width="50%" height={30} />
                            <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto', mt: 2 }} />
                        </Card>
                    </Grid>
                </Grid>
                <Card sx={{ p: 3 }}>
                    <Skeleton variant="text" width="40%" height={30} />
                    <Grid container spacing={2} mt={1}>
                        {[1, 2, 3, 4].map((item) => (
                            <Grid size={{ xs: 6, md: 3 }} key={item}>
                                <Skeleton variant="rounded" height={60} />
                            </Grid>
                        ))}
                    </Grid>
                </Card>
            </Stack>
        );
    }

    if (summary.error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>
                <Card sx={{ p: 4, textAlign: 'center', bgcolor: alpha(theme.palette.warning.light, 0.1) }}>
                    <AlertTriangle size={48} color={theme.palette.warning.main} style={{ marginBottom: 16 }} />
                    <Typography variant="h6" color="warning.main" gutterBottom>
                        Unable to Load Statistics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Could not retrieve drive statistics for this user. Please try again later.
                    </Typography>
                </Card>
            </motion.div>
        );
    }

    return (
        <Box component={motion.div} layout>
            <Stack
                component={motion.div}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                spacing={3}>
                {/* Main Statistics Row */}
                <Grid container spacing={2}>
                    {/* Overview Card */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={2} p={3}>
                            <Typography variant="h6" color="primary.main" fontWeight="bold">
                                Storage Overview
                            </Typography>

                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Files
                                    </Typography>
                                    <Chip
                                        label={totalFiles.toLocaleString()}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Stack>

                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Folders
                                    </Typography>
                                    <Chip
                                        label={folderCount.toLocaleString()}
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                    />
                                </Stack>

                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Size
                                    </Typography>
                                    <Chip
                                        label={formatFileSize(totalSize)}
                                        size="small"
                                        color={usagePercentage > 90 ? "error" : "success"}
                                        variant="filled"
                                    />
                                </Stack>
                            </Box>

                            {driveSizeLimit && (
                                <Box mt={2}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight="medium">
                                            Storage Used
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            fontWeight="bold"
                                            color={usagePercentage > 90 ? "error" : usagePercentage > 75 ? "warning" : "primary"}>
                                            {usagePercentage.toFixed(1)}%
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(usagePercentage, 100)}
                                        color={usagePercentage > 90 ? "error" : usagePercentage > 75 ? "warning" : "primary"}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            mb: 1
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(totalSize)} of {formatFileSize(driveSizeLimit)}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Grid>

                    {/* Chart Card */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2} p={3}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold">
                                    File Type Distribution
                                </Typography>
                                {isMobile && (
                                    <Chip
                                        icon={chartView === 'pie' ? <BarChart3 size={16} /> : <PieChartIcon size={16} />}
                                        label={chartView === 'pie' ? 'List' : 'Chart'}
                                        onClick={toggleChartView}
                                        size="small"
                                        variant="outlined"
                                        clickable
                                    />
                                )}
                            </Stack>

                            {totalFiles > 0 ? (
                                <Box sx={{ height: isMobile ? 250 : 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            {(isMobile && chartView === 'legend') ? null : (
                                                <Pie
                                                    data={mimeData}
                                                    dataKey="count"
                                                    nameKey="type"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={isMobile ? "50%" : "60%"}
                                                    outerRadius={isMobile ? "70%" : "80%"}
                                                    paddingAngle={2}
                                                    label={({ type, percent }) => {
                                                        const label = typeof type === "string" ? type : String(type ?? "");
                                                        return isMobile ?
                                                            `${((percent || 0) * 100).toFixed(0)}%` :
                                                            `${truncateLabel(label, 8)}: ${((percent || 0) * 100).toFixed(0)}%`;
                                                    }}
                                                    labelLine={false}>
                                                    {mimeData.map((_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={COLORS[index % COLORS.length]}
                                                            stroke={theme.palette.background.paper}
                                                            strokeWidth={2}
                                                        />
                                                    ))}
                                                </Pie>
                                            )}

                                            {(!isMobile || chartView === 'legend') && (
                                                <Legend
                                                    verticalAlign="middle"
                                                    align="right"
                                                    layout="vertical"
                                                    wrapperStyle={{
                                                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                        fontWeight: 500,
                                                        paddingLeft: isMobile ? '10px' : '20px'
                                                    }}
                                                    formatter={(value, entry) => {
                                                        const item = mimeData.find(m => m.type === value);
                                                        return isMobile ?
                                                            `${truncateLabel(value, 10)}` :
                                                            `${truncateLabel(value, 15)} (${item?.count})`;
                                                    }}
                                                />
                                            )}

                                            <Tooltip
                                                formatter={(value: number) => [`${value} files`, 'Count']}
                                                labelFormatter={(label, payload) => {
                                                    const item = payload?.[0]?.payload;
                                                    return item?.fullType || label;
                                                }}
                                                content={<CustomTooltip />}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            ) : (
                                <Box sx={{
                                    height: 300,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    color: 'text.secondary',
                                    gap: 2
                                }}>
                                    <PieChartIcon size={48} />
                                    <Typography variant="body2" textAlign="center">
                                        No files available for analysis
                                    </Typography>
                                    <Typography variant="caption" textAlign="center">
                                        Upload files to see distribution statistics
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                {/* Additional Stats Card */}
                <Stack p={3} boxShadow={2} borderRadius={2} sx={{ backdropFilter: 'blur(10px)'}}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                        Additional Information
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stack spacing={0.5} alignItems="center" textAlign="center">
                                <AlertCircle size={20} color={theme.palette.info.main} />
                                <Typography variant="caption" color="text.secondary">
                                    Max Upload Size
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {maxUploadSizeOptionInString ?
                                        formatFileSize(getFileSizeFromUnit(maxUploadSizeOptionInString)) :
                                        'Unlimited'
                                    }
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stack spacing={0.5} alignItems="center" textAlign="center">
                                <AlertCircle size={20} color={theme.palette.warning.main} />
                                <Typography variant="caption" color="text.secondary">
                                    Drive Limit
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {driveSizeLimit ?
                                        formatFileSize(driveSizeLimit) :
                                        'Unlimited'
                                    }
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stack spacing={0.5} alignItems="center" textAlign="center">
                                <AlertCircle size={20} color={theme.palette.success.main} />
                                <Typography variant="caption" color="text.secondary">
                                    File Types
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {mimeData.length} types
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stack spacing={0.5} alignItems="center" textAlign="center">
                                <AlertCircle size={20} color={theme.palette.primary.main} />
                                <Typography variant="caption" color="text.secondary">
                                    Avg File Size
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {totalFiles > 0 ?
                                        formatFileSize(totalSize / totalFiles) :
                                        '0 B'
                                    }
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </Stack>
            </Stack>
        </Box>
    );
}