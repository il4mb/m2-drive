"use client";

import useRequest from "@/components/hooks/useRequest";
import Pattern from "@/components/icon/Pattern";
import { Button, Stack, TextField, Typography, Paper, Box, Alert, AlertTitle } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useState } from "react";

export interface PageProps {
    children?: ReactNode;
}

export default function Page({ children }: PageProps) {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const request = useRequest({
        endpoint: '/api/auth',
        method: "POST",
        body: { email, password },
        onSuccess(result) {

        },
    })
    const handleLogin = () => {
        request.send();
    };

    return (
        <Stack
            flex={1}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: "100vh" }}>
            <Paper
                component={motion.div}
                elevation={4}
                sx={{
                    position: 'relative',
                    p: 4,
                    borderRadius: 3,
                    minWidth: 340,
                    maxWidth: 400,
                    width: "100%",
                    zIndex: 10
                }} >
                <Typography variant="h5" fontWeight="bold" textAlign="center" mb={3}>
                    Masuk ke Akun
                </Typography>

                <AnimatePresence>
                    {request.error && (
                        <Box
                            component={motion.div}
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            my={2}>
                            <Alert
                                severity='error'
                                variant='outlined'
                                onClose={request.clearError}>
                                <AlertTitle>{request.error.type}</AlertTitle>
                                {request.error.message}
                            </Alert>
                        </Box>
                    )}
                </AnimatePresence>

                <Stack spacing={2}>
                    <TextField
                        label="Alamat Surel"
                        placeholder="contoh: jhon-doe@gmail.com"
                        type="email"
                        variant="outlined"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Stack>
                        <TextField
                            label="Kata Sandi"
                            type="password"
                            variant="outlined"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Typography component={'small'} fontSize={12}>Lupa Kata Sandi?</Typography>
                    </Stack>

                    <Button
                        variant="contained"
                        fullWidth
                        sx={{ mt: 1, borderRadius: 2 }}
                        onClick={handleLogin}
                        loading={request.pending}>
                        Login
                    </Button>
                </Stack>

                {children && <Stack mt={2}>{children}</Stack>}
            </Paper>

            <Box sx={{
                position: "fixed",
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                pointerEvents: 'none',
                filter: 'blur(1.5px)'
            }}>
                <Pattern
                    width={'100%'}
                    height={'100%'}
                    opacity={0.8} />
            </Box>
        </Stack>
    );
}
