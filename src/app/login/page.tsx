"use client";

import { handleLoginAsync } from "@/actions/login";
import useRequest from "@/hooks/useRequest";
import RequestError from "@/components/RequestError";
import { isEmailValid } from "@/libs/validator";
import { Button, Stack, TextField, Typography, Paper, Box } from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionManager } from "@/components/context/SessionManager";
import Link from "next/link";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import PasswordField from "@/components/ui/PasswordField";
import M2DriveLinearColor from "@/components/icon/M2DriveLinearColor";

export default function LoginPage() {

    const { userId, startSession } = useSessionManager();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState({ email: false, password: false });

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
            handleStartSession(data?.tokenId || "");
        }
    });

    const isBussy = request.pending || loading;

    const handleStartSession = async (tokenId: string) => {
        if (loading) return;
        setLoading(true);
        try {
            await startSession(tokenId);
        } catch (error: any) {
            enqueueSnackbar(`Gagal Memulai Sesi: ${error.message || "Unknown Error"}`, {
                variant: 'error',
                action: CloseSnackbar
            });
        } finally {
            setLoading(false);
        }
    }

    const handleLogin = () => request.send();
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
        if (userId) handleRedirect();
    }, [userId]);

    return (
        <Stack
            flex={1}
            alignItems="center"
            justifyContent="center"
            sx={{
                minHeight: "100vh",
                px: [2, 2, 0],
                position: "relative",
                overflow: "hidden"
            }}>

            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                elevation={8}
                sx={{
                    position: 'relative',
                    p: { xs: 3, sm: 4 },
                    borderRadius: 4,
                    width: "100%",
                    maxWidth: 440,
                    zIndex: 10,
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}>

                <Stack direction={"row"} alignItems={"end"}>
                    <M2DriveLinearColor
                        width={'3em'}
                        height={'3em'} />
                    <Typography
                        fontSize={26}
                        fontWeight="900"
                        gutterBottom
                        sx={{
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            ml: -0.5,
                            mb: 0.7
                        }}>
                        DRIVE
                    </Typography>
                </Stack>
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography
                        variant="h4"
                        fontWeight="800"
                        gutterBottom
                        sx={{
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>
                        Selamat Datang
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Masuk untuk melanjutkan ke <strong>M2 Drive</strong>
                    </Typography>
                </Box>

                <AnimatePresence>
                    <RequestError key={"error1"} request={request} sx={{ mb: 2 }} closable />
                </AnimatePresence>

                <Stack gap={3}>
                    <TextField
                        disabled={isBussy}
                        label="Alamat Surel"
                        placeholder="contoh: jhon-doe@gmail.com"
                        type="email"
                        variant="outlined"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setIsFocused({ ...isFocused, email: true })}
                        onBlur={() => setIsFocused({ ...isFocused, email: false })}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                backgroundColor: isFocused.email ? 'rgba(76, 145, 226, 0.05)' : 'transparent',
                                '&.Mui-focused fieldset': {
                                    borderWidth: '2px',
                                    borderColor: '#667eea',
                                },
                            }
                        }}
                    />

                    <PasswordField
                        disabled={isBussy}
                        label="Kata Sandi"
                        value={password}
                        onChange={setPassword}
                        showable
                        textFieldProps={{
                            sx: {
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s ease',
                                    backgroundColor: isFocused.password ? 'rgba(76, 145, 226, 0.05)' : 'transparent',
                                    '&.Mui-focused fieldset': {
                                        borderWidth: '2px',
                                        borderColor: '#667eea',
                                    },
                                }
                            }
                        }} />
                    {/*                    
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography
                            component={Link}
                            href="/forgot-password"
                            variant="body2"
                            sx={{
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': {
                                    textDecoration: 'underline'
                                }
                            }}>
                            Lupa Kata Sandi?
                        </Typography>
                    </Box> */}

                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    border: '2px solid #e9ecef',
                                    borderTop: '2px solid #667eea',
                                }}
                            />
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        fullWidth
                        sx={{
                            mt: 3,
                            borderRadius: 2,
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            boxShadow: "0 4px 6px rgba(102, 126, 234, 0.3)",
                            '&:hover': {
                                boxShadow: "0 6px 8px rgba(102, 126, 234, 0.4)",
                                background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                            }
                        }}
                        disabled={!request.isValid || isBussy}
                        onClick={handleLogin}>
                        {isBussy ? "Memproses..." : "Masuk"}
                    </Button>

                    {/* <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Belum punya akun?{" "}
                            <Typography
                                component={Link}
                                href="/register"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    '&:hover': {
                                        textDecoration: 'underline'
                                    }
                                }}>
                                Daftar sekarang
                            </Typography>
                        </Typography>
                    </Box> */}
                </Stack>
            </Paper>

            <Box sx={{
                position: "absolute",
                bottom: 20,
                zIndex: 1,
            }}>
                <Typography
                    component={Link}
                    href={"/about"}
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': {
                            color: 'primary.main',
                            textDecoration: 'underline'
                        }
                    }}>
                    Tentang M2
                </Typography>
            </Box>
        </Stack>
    );
}