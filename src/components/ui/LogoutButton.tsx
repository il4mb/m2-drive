'use client'

import { handleLogoutAsync } from '@/actions/login';
import useRequest from '@/hooks/useRequest';
import { socket } from '@/socket';
import { Button, SxProps, Tooltip } from '@mui/material';
import { DoorOpen } from 'lucide-react';

type LogoutButtonProps = {
    sx?: SxProps
}
export default function LogoutButton({ sx }: LogoutButtonProps) {

    const logoutRequest = useRequest({
        action: handleLogoutAsync,
        onComplete() {
            socket.disconnect();
            window.location.href = "/login";
        },
    })

    return (
        <Tooltip title="Akhiri Sesi?" arrow>
            <Button
                loading={logoutRequest.pending}
                onClick={logoutRequest.send}
                variant='outlined'
                color='error'
                startIcon={<DoorOpen size={18} />}
                sx={{ px: 2, ...sx }}>
                Keluar
            </Button>
        </Tooltip>
    );
}