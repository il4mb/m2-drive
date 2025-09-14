"use client";

import { TooltipProps } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Typography, Stack, Box } from "@mui/material";

// @ts-ignore
export const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label, formatter, labelFormatter, }) => {
    return (
        <AnimatePresence>
            {active && payload && payload.length > 0 && (
                <motion.div
                    key="tooltip"
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    style={{ pointerEvents: "none" }}>
                    <Stack
                        sx={(theme) => ({
                            minWidth: 180,
                            borderRadius: 2,
                            boxShadow: "0 0 1px #0007",
                            background: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(2px)",
                            ...theme.applyStyles("dark", {
                                boxShadow: "0 0 1px rgba(117, 117, 117, 0.27)",
                                background: "rgba(0, 0, 0, 0.7)",
                            }),
                        })}>
                        <Stack sx={{ p: 1.5 }}>
                            {/* Label atas */}
                            {label && (
                                <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                    color="text.primary"
                                    gutterBottom>
                                    {labelFormatter ?
                                        // @ts-ignore
                                        labelFormatter(label) : label}
                                </Typography>
                            )}

                            {/* Render payload */}
                            <Stack spacing={0.5}>
                                {payload.map((entry: any, i: number) => {
                                    let displayName = entry.name;
                                    let displayValue = entry.value;

                                    if (formatter) {
                                        // @ts-ignore
                                        const res = formatter(entry.value, entry.name, entry, i);
                                        // formatter boleh return [value, name] atau value doang
                                        if (Array.isArray(res)) {
                                            [displayValue, displayName] = res;
                                        } else {
                                            displayValue = res;
                                        }
                                    }

                                    return (
                                        <Stack
                                            key={i}
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}>
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background:
                                                        entry.color ||
                                                        entry.fill ||
                                                        entry.payload.fill ||
                                                        "#929292ff",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{ flexGrow: 1, color: "text.secondary" }}>
                                                {displayName}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                fontWeight="medium"
                                                color="text.primary">
                                                {displayValue}
                                            </Typography>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </Stack>
                    </Stack>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
