import User from '@/entity/User';
import { getOne } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { getColor } from '@/theme/colors';
import { Avatar, Box, Stack, SxProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

export interface UserAvatarProps {
    userId?: string;
    size?: number;
    sx?: SxProps;
}

export default function UserAvatar({ userId, size = 45, sx }: UserAvatarProps) {
    // Active indicator: 20% of size, clamped between 6 and 50
    const indicatorSize = Math.min(70, Math.max(6, size * 0.3));
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if(!userId) return;
        const query = getOne("user").where("id", "==", userId);
        const unsubscribe = onSnapshot(query, (data) => {
            setUser(data);
        });
        return unsubscribe;
    }, [userId])

    return (
        <Tooltip title={`${user?.name}`} arrow>
            <Stack sx={{ position: 'relative' }}>
                <Avatar
                    src={user?.meta.avatar}
                    sx={{ width: size, height: size, ...sx }}>
                    {user?.name?.[0] || "?"}
                </Avatar>
                {user?.meta.isActive && (
                    <Box sx={(theme) => ({
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        width: indicatorSize,
                        height: indicatorSize,
                        bgcolor: getColor('info')[400],
                        borderRadius: '50%',
                        ...theme.applyStyles("dark", {
                            bgcolor: getColor('info')[200],
                        })
                    })} />
                )}
            </Stack>
        </Tooltip>
    );
}
