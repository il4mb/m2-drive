"use client"

import Container from '@/components/Container';
import { Paper, Stack, TextField, Typography } from '@mui/material';

export default function page() {


    return (
        <Container maxWidth='lg'>
            <Stack component={Paper} p={4} borderRadius={4}>

                <Typography textAlign={"center"} fontSize={26} fontWeight={600} mb={3}>
                    Selamat Datang di <strong>SIP</strong>
                </Typography>

            
            </Stack>
        </Container>
    );
}