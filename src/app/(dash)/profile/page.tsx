'use client'

import { getProfile } from '@/actions/profile';
import Container from '@/components/Container';
import useRequest from '@/components/hooks/useRequest';
import RequestError from '@/components/RequestError';
import User from '@/entity/User';
import { Avatar, Paper, Stack, Typography } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';

export interface pageProps {
    children?: ReactNode;
}
export default function page({ children }: pageProps) {

    const [user, setUser] = useState<User>();
    const request = useRequest({
        action: getProfile,
        onSuccess({ data }) {
            if (data) setUser(data);
        },
    });

    useEffect(() => {
        request.send();
    }, []);

    return (
        <Container>
            <Stack flex={1} justifyContent={"center"} alignItems={"center"}>
                <Stack component={Paper} borderRadius={2} boxShadow={2} p={4} maxWidth={600} width={'100%'}>
                    <RequestError
                        request={request}
                        tryagain />
                    {user && (
                        <Stack alignItems={"center"}>
                            <Avatar src={user.meta.avatar} sx={{ width: 100, height: 100 }} />
                            <Typography fontSize={22} fontWeight={600}>{user.name}</Typography>
                            <Typography fontSize={14} color='text.secondary'>{user.email}</Typography>
                        </Stack>
                    )}

                </Stack>
            </Stack>
        </Container>
    );
}