"use client";

import { handleLoginAsync, handleStartSession } from "@/actions/login";
import useRequest from "@/hooks/useRequest";
import Pattern from "@/components/icon/Pattern";
import RequestError from "@/components/RequestError";
import { isEmailValid } from "@/libs/validator";
import { Button, Stack, TextField, Typography, Paper, Box, Alert, AlertTitle } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useSessionManager } from "@/components/context/SessionManager";
import { socket } from "@/socket";

export interface PageProps {
    children?: ReactNode;
}

export default function Page({ children }: PageProps) {

    const { userId } = useSessionManager();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [tokenId, setTokenId] = useState("");
    const [loading, setLoading] = useState(false);

    const request = useRequest({
        action: handleLoginAsync,
        params: { email, password },
        validator({ email, password }) {
            return Boolean(isEmailValid(email) && password.length >= 8);
        },
        onSuccess({ data }) {
            setTokenId(data?.tokenId || "");
        }
    });

    const requestStartSession = useRequest({
        action: handleStartSession,
        params: { tokenId },
        onSuccess() {
            resetSocket();
        }
    });
    const handleLogin = () => request.send();


    const resetSocket = () => {
        if (loading) return;
        setLoading(true);
        socket.close();
        socket.connect();
        socket.emit("session-validate");
    }

    const handleRedirect = () => {
        setLoading(true);
        const redirect = searchParams.get("redirect");
        if (redirect) {
            router.push(redirect)
        } else {
            router.push("/");
        }
    }

    useEffect(() => {
        if (!tokenId) return;
        requestStartSession.send();
    }, [tokenId]);

    useEffect(() => {
        if (userId) handleRedirect();
    }, [userId]);



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
                    <RequestError request={request} sx={{ mb: 2 }} closable />
                    <RequestError request={requestStartSession} sx={{ mb: 2 }} closable />
                </AnimatePresence>

                <Stack spacing={2}>
                    <TextField
                        disabled={request.pending || requestStartSession.pending || loading}
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
                            disabled={request.pending || requestStartSession.pending || loading}
                            label="Kata Sandi"
                            type="password"
                            variant="outlined"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Typography component={'small'} fontSize={12}>Lupa Kata Sandi?</Typography>
                    </Stack>

                    {loading && (
                        <Typography
                            textAlign={"center"}
                            variant={"caption"}
                            my={2}>
                            Mohon tunggu sebentar...
                        </Typography>
                    )}

                    <Button
                        variant="contained"
                        fullWidth
                        sx={{ mt: 1, borderRadius: 2 }}
                        disabled={!request.isValid}
                        onClick={handleLogin}
                        loading={request.pending || requestStartSession.pending || loading}>
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
