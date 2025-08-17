"use client"

import { Container, Stack, TextField, Typography } from '@mui/material';

export default function page() {


    return (
        <Stack flex={1} py={4}>
            <Container>
                <Typography textAlign={"center"} fontSize={26} fontWeight={600} mb={3}>
                    Selamat Datang di <strong>SIP</strong>
                </Typography>
                <TextField fullWidth sx={{ borderRadius: 118 }} />

                <Typography fontSize={18} fontWeight={600}>Folders</Typography>
                <Stack>

                </Stack>

                <Typography fontSize={18} fontWeight={600}>Files</Typography>
                <Stack>

                </Stack>

            </Container>

        </Stack>
    );
}