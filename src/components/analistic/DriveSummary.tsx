import User from '@/entities/User';
import { useDriveUssageSummary } from '@/hooks/useDriveSummry';
import { useOption } from '@/hooks/useOption';
import { formatFileSize, getFileSizeFromUnit } from '@/libs/utils';
import { Box, Card, Chip, Grid, LinearProgress, Stack, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'motion/react';
import { ReactNode, useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DriveSummaryProps {
    children?: ReactNode;
    user?: User;
}

export default function DriveSummary({ user }: DriveSummaryProps) {
    const theme = useTheme();
    const summary = useDriveUssageSummary(user?.id);
    const [driveSizeOptionInString] = useOption(`@drive-size-${user?.meta.role}`, '100gb');
    const [maxUploadSizeOptionInString] = useOption(`@max-upload-${user?.meta.role}`, '100gb');

    const mimeData = useMemo(() =>
        Object.entries(summary.data?.mimeBreakdown || {})
            .map(([type, count]) => ({
                type: type.split('/')[1] || type, // Show only subtype (e.g., "png" instead of "image/png")
                fullType: type,
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8), // Limit to top 8 types
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

    if (summary.loading) {
        return (
            <Stack spacing={2} p={3}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Loading drive statistics...
                </Typography>
            </Stack>
        );
    }

    return (
        <Box component={motion.div} layout>

            {summary.loading ? (
                <Stack spacing={2} p={3}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        Loading drive statistics...
                    </Typography>
                </Stack>
            ) : (
                <Stack component={motion.div}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    spacing={3}>
                    <Stack direction={["column", "column", "row"]} flexWrap={'wrap'} gap={1}>
                        {/* Statistics Cards */}
                        <Stack minWidth={240} maxWidth={380}>
                            <Card sx={{ p: 3, height: '100%', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                <Stack spacing={2}>
                                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                                        Overview
                                    </Typography>

                                    <Box>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Files
                                            </Typography>
                                            <Chip label={totalFiles.toLocaleString()} size="small" color="primary" />
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body2" color="text.secondary">
                                                Folders
                                            </Typography>
                                            <Chip label={folderCount.toLocaleString()} size="small" color="secondary" />
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" color="text.secondary">
                                                Total Size
                                            </Typography>
                                            <Chip
                                                label={formatFileSize(totalSize)}
                                                size="small"
                                                color={usagePercentage > 90 ? "error" : "success"}
                                            />
                                        </Stack>
                                    </Box>

                                    {driveSizeLimit && (
                                        <Box mt={2}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Storage Used
                                                </Typography>
                                                <Typography variant="caption" fontWeight="bold">
                                                    {usagePercentage.toFixed(1)}%
                                                </Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(usagePercentage, 100)}
                                                color={usagePercentage > 90 ? "error" : usagePercentage > 75 ? "warning" : "primary"}
                                                sx={{ height: 6, borderRadius: 3 }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {formatFileSize(totalSize)} of {formatFileSize(driveSizeLimit)}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Card>
                        </Stack>

                        {/* Pie Chart */}
                        <Stack flex={1}>
                            <Card sx={{ p: 3, height: '100%' }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold">
                                    File Type Distribution
                                </Typography>

                                {totalFiles > 0 ? (
                                    <Box sx={{ height: 300, mt: 2 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={mimeData}
                                                    dataKey="count"
                                                    nameKey="type"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="60%"
                                                    outerRadius="80%"
                                                    paddingAngle={2}
                                                    label={({ type, count, percent }) =>
                                                        `${type}: ${((percent || 0) * 100).toFixed(0)}%`
                                                    }
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
                                                <Tooltip
                                                    formatter={(value: number) => [`${value} files`, 'Count']}
                                                    labelFormatter={(label, payload) => {
                                                        const item = payload?.[0]?.payload;
                                                        return item?.fullType || label;
                                                    }}
                                                />
                                                <Legend
                                                    verticalAlign="middle"
                                                    align="right"
                                                    layout="vertical"
                                                    wrapperStyle={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                        paddingLeft: '20px'
                                                    }}
                                                    formatter={(value, entry) => {
                                                        const item = mimeData.find(m => m.type === value);
                                                        return `${value} (${item?.count})`;
                                                    }}
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
                                        color: 'text.secondary'
                                    }}>
                                        <Typography variant="body2" gutterBottom>
                                            No files found
                                        </Typography>
                                        <Typography variant="caption">
                                            Upload files to see statistics
                                        </Typography>
                                    </Box>
                                )}
                            </Card>
                        </Stack>
                    </Stack>

                    {/* Additional Stats Row */}
                    <Stack>
                        <Card sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                Additional Information
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <Stack spacing={0.5}>
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
                                    <Stack spacing={0.5}>
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
                                    <Stack spacing={0.5}>
                                        <Typography variant="caption" color="text.secondary">
                                            File Types
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {mimeData.length} types
                                        </Typography>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <Stack spacing={0.5}>
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
                        </Card>
                    </Stack>
                </Stack>
            )}

        </Box>
    );
}