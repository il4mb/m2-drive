'use client'

import User from '@/entity/User';
import { ReactNode } from 'react';
import { motion } from "motion/react";
import { alpha, Chip, Paper, Stack, useTheme } from '@mui/material';
import { MousePointer2, Navigation } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

export interface ParticipantProps {
    user?: User;
    isMe?: boolean;
    color?: string;
    x: number;
    y: number;
    isEdgeIndicator?: boolean;
    edgeAngle?: number;
}

export default function Participant({
    user,
    x,
    y,
    color = "#2d58a8ff",
    isMe = false,
    isEdgeIndicator = false,
    edgeAngle = 0
}: ParticipantProps) {
    const theme = useTheme();

    if (isEdgeIndicator) {
        return (
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.8 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    zIndex: 1000,
                    paddingBottom: 100
                }}>
                <Stack direction={edgeAngle > -90 && edgeAngle < 90 ? "column" : "column-reverse"} alignItems="center" spacing={0.5}>
                    <Navigation
                        size={24}
                        fill={color}
                        color={color}
                        style={{ transform: `rotate(${edgeAngle - 45}deg)` }}
                    />
                    <Chip
                        label={user?.name || 'Unknown'}
                        size="small"
                        sx={{
                            bgcolor: alpha(color, 0.9),
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20,
                            '& .MuiChip-label': { px: 1 }
                        }}
                    />
                </Stack>
            </motion.div>
        );
    }

    // Normal participant cursor
    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
                type: "spring",
                damping: 25,
                stiffness: 400,
                duration: 0.1
            }}
            style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                zIndex: isMe ? 1112 : 1001
            }}>
            <Stack
                alignItems="center"
                spacing={0.5}
                sx={{
                    filter: isMe ? 'drop-shadow(0 0 12px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                    transition: 'all 0.2s ease'
                }}
            >
                <MousePointer2 stroke={color} style={{ position: 'absolute', top: 0, left: 0 }} />
                <UserAvatar
                    disableIndicator
                    user={user}
                    sx={{
                        mt: 1,
                        ml: 1.4,
                        width: 44,
                        height: 44,
                        bgcolor: color,
                        border: `3px solid ${isMe ? theme.palette.primary.main : alpha(color, 0.4)}`,
                        boxShadow: theme.shadows[4],
                        fontSize: '1rem',
                        fontWeight: 600
                    }}
                />
            </Stack>
        </motion.div>
    );
}