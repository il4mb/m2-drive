import User from '@/entities/User';
import { getOne } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { getColor } from '@/theme/colors';
import { Avatar, Box, Stack, SxProps, Tooltip } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';

export interface UserAvatarProps {
    userId?: string;
    user?: User|null;
    size?: number;
    sx?: SxProps;
    tooltip?: ReactNode;
    disableIndicator?: boolean;
}

export default function UserAvatar({ userId, user: initialUser, size = 45, disableIndicator = false, tooltip, sx }: UserAvatarProps) {
    // Active indicator: 20% of size, clamped between 6 and 50
    const indicatorSize = Math.min(70, Math.max(6, size * 0.3));
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (!userId || initialUser) {
            return;
        }
        const query = getOne("user").where("id", "==", userId);
        const unsubscribe = onSnapshot(query, (data) => {
            setUser(data);
        });
        return unsubscribe;
    }, [userId, initialUser]);

    return (
        <Tooltip title={tooltip || `${(user || initialUser)?.name}`} arrow>
            <Stack sx={{ position: 'relative', }}>
                <Avatar
                    src={(user || initialUser)?.meta.avatar}
                    sx={{ width: size, height: size, ...sx }}>
                    {user?.name?.[0] || "?"}
                </Avatar>
                {(!disableIndicator && (user || initialUser)?.meta.isActive) && (
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
