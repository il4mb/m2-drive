import User from '@/entities/User';
import { getMany, Json } from '@/libs/websocket/query';
import { Stack, Typography, Avatar, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';
import UserAvatar from './ui/UserAvatar';
import RelativeTime from './RelativeTime';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';

export default function OnlineUsers() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const query = getMany('user').where(Json("meta", "isActive"), "==", true);
        const unsubscribe = onSnapshot(query, ({ rows }) => {
            setUsers(rows);
        });
        return unsubscribe;
    }, []);

    const maxDisplay = 5;
    const displayedUsers = users.slice(0, maxDisplay);
    const extraCount = users.length - maxDisplay;

    return (
        <Stack>
            <Stack direction="row" justifyContent="start" alignItems="center" ml={2} mb={1}>
                {displayedUsers.map(e => (
                    <UserAvatar
                        key={e.id}
                        user={e}
                        tooltip={
                            <>
                                {e.name} Aktif <RelativeTime timestamp={e.meta.activeAt || 0} />
                            </>
                        }
                        sx={{ ml: -1, boxShadow: 1 }}
                    />
                ))}

                {extraCount > 0 && (
                    <Tooltip title={`${extraCount} pengguna lainnya`}>
                        <Avatar
                            sx={{
                                ml: -1,
                                bgcolor: 'primary.main',
                                fontSize: 14,
                                width: 45,
                                height: 45,
                            }}>
                            +{extraCount}
                        </Avatar>
                    </Tooltip>
                )}
            </Stack>
            <Typography color='text.secondary' variant='caption'>{users.length} pengguna aktif</Typography>
        </Stack>
    );
}
