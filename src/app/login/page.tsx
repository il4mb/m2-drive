"use client";

import { handleLoginAsync, handleStartSession } from "@/actions/login";
import useRequest from "@/hooks/useRequest";
import Pattern from "@/components/icon/Pattern";
import RequestError from "@/components/RequestError";
import { isEmailValid } from "@/libs/validator";
import { Button, Stack, TextField, Typography, Paper, Box } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionManager } from "@/components/context/SessionManager";
import { socket } from "@/socket";
import Link from "next/link";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "@/components/ui/CloseSnackbar";


export default function page() {

    const [mounted, setMounted] = useState(false);
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
        onError(error) {
            enqueueSnackbar(error.message, {
                variant: "error",
                action: CloseSnackbar
            })
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
            router.push(decodeURIComponent(redirect))
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

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null;

    return (
        <Stack
            flex={1}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: "100vh", px: [2, 2, 0] }}>
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
                }}>
                <Typography variant="h5" fontWeight="bold" textAlign="center" mb={3}>
                    Masuk ke Akun
                </Typography>

                <AnimatePresence>
                    <RequestError key={"error1"} request={request} sx={{ mb: 2 }} closable />
                    <RequestError key={"error2"} request={requestStartSession} sx={{ mb: 2 }} closable />
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
                        {/* <Typography component={'small'} fontSize={12}>Lupa Kata Sandi?</Typography> */}
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
                        aria-multiselectable
                        variant="contained"
                        fullWidth
                        sx={{ mt: 1, borderRadius: 2 }}
                        disabled={!request.isValid}
                        onClick={handleLogin}
                        loading={request.pending || requestStartSession.pending || loading}>
                        Login
                    </Button>

                    <Typography component={Link} href={"/about"}>Tentang M2</Typography>
                </Stack>
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
