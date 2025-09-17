import { CustomTooltip } from "@/components/CustomTooltip";
import { formatDuration } from "@/libs/utils";
import { alpha, Stack, Typography, useTheme } from "@mui/material";
import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


export type HourlyStat = {
    hour: number;
    total: number;
    avgExecTime: number;
};


export default function TaskTimelineChart({ data }: { data: any[] }) {
    const theme = useTheme();

    return (
        <Stack>
            <Typography variant="h6" fontWeight={600} gutterBottom>
                Tasks Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                    // @ts-ignore
                    data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip
                        formatter={(value, name) => {
                            if (name === "avgExecTime") {
                                return [formatDuration(Number(value)), "Avg Exec Time"];
                            }
                            if (name === "total") {
                                return [value, "Total Tasks"];
                            }
                            return [value, name];
                        }}
                        contentStyle={{ borderRadius: 8 }}
                        content={<CustomTooltip />}
                    />

                    <Area
                        type="monotone"
                        dataKey="total"
                        stroke={theme.palette.primary.main}
                        fill={alpha(theme.palette.primary.main, 0.2)}
                        fillOpacity={1}
                    />
                    <Area
                        type="monotone"
                        dataKey="avgExecTime"
                        stroke={theme.palette.warning.main}
                        fill={alpha(theme.palette.warning.main, 0.2)}
                        fillOpacity={1}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Stack>
    );
};