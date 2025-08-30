"use client"

import Container from '@/components/Container';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import { socket } from '@/socket';
import { Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export default function page() {

    const { user } = useCurrentSession();
    const [data, setData] = useState();

    useEffect(() => {
        const onReceived = (data: any) => {
            setData(data);
        }
        socket.on("list", onReceived);

        return () => {
            socket.off("list", onReceived);
        }
    }, [])


    return (
        <Container maxWidth='lg'>
            <Stack component={Paper} p={4} borderRadius={4}>

                <Typography textAlign={"center"} fontSize={26} fontWeight={600} mb={3}>
                    Selamat Datang di <strong>SIP</strong>
                </Typography>

                {JSON.stringify(data)}
                
                <TextField fullWidth sx={{ borderRadius: 118 }} />

                <Typography fontSize={18} fontWeight={600}>Folders</Typography>

                <Stack>

                </Stack>

                <Typography fontSize={18} fontWeight={600}>Files</Typography>
                <Stack>

                </Stack>
            </Stack>
        </Container>
    );
}