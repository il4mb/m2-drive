"use client";

import { TooltipProps } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Typography, Stack, Box } from "@mui/material";

// @ts-ignore
export const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label, }) => {

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
                            {/* Label atas (misalnya tanggal/kategori) */}
                            {label && (
                                <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                    color="text.primary"
                                    gutterBottom>
                                    {label}
                                </Typography>
                            )}

                            {/* Render semua key/value dari payload */}
                            <Stack spacing={0.5}>
                                {payload.map((entry: any, i: number) => {
                                    return (
                                        <Stack
                                            key={i}
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}>
                                            {/* Warna legend */}
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background: entry.color || entry.fill || entry.payload.fill || "#929292ff",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{ flexGrow: 1, color: "text.secondary" }}>
                                                {entry.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                fontWeight="medium"
                                                color="text.primary">
                                                {entry.value}
                                            </Typography>
                                        </Stack>
                                    )
                                })}
                            </Stack>
                        </Stack>
                    </Stack>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
