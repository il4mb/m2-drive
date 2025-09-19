'use client'

import { SocketResult } from '@/server/socketHandlers';
import { socket } from '@/socket';
import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Stack,
    alpha,
    useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    WifiOff,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    User,
    Server
} from 'lucide-react';
import { handleStartSession } from '@/actions/login';

interface SessionManagerState {
    userId: string | null;
    connected: boolean;
    isValidating: boolean;
    startSession: (tokenId: string) => Promise<void>;
}

const SessionManagerContext = createContext<SessionManagerState | undefined>(undefined);

type SessionManagerProps = {
    children?: ReactNode;
}

export const SessionManager = ({ children }: SessionManagerProps) => {

    const theme = useTheme();
    const ignoreEventRef = useRef(false);
    const [connected, setConnected] = useState(socket.connected);
    const [userId, setUserId] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(true);
    const [retryCount, setRetryCount] = useState(0);

    const onSocketConnect = () => {
        if (ignoreEventRef.current) return;
        setConnected(true);
        setIsValidating(true);
        socket.emit("session-validate");
    };

    const onSocketDisconnect = () => {
        if (ignoreEventRef.current) return;
        setConnected(false);
        setUserId(null);
        setIsValidating(false);
    };

    const onSessionValidateResult = (result: SocketResult<{ userId: string }>) => {
        setIsValidating(false);
        if (result.success) {
            setUserId(result.data?.userId || null);
        } else {
            setUserId(null);
        }
    };

    const startSession = useCallback(async (tokenId: string) => {
        await handleStartSession({ tokenId });
        restartSocket();
    }, []);

    const restartSocket = () => {

        ignoreEventRef.current = true;
        
        socket.close();
        socket.connect();
        socket.emit("session-validate");
        setRetryCount(prev => prev + 1);

        setTimeout(() => {
            ignoreEventRef.current = false;
        }, 100);
    }

    const value = useMemo(() => ({
        userId, connected, isValidating, startSession
    }), [userId, connected, isValidating, startSession]);

    useEffect(() => {
        // Set initial connection state
        setConnected(socket.connected);

        // If already connected, validate session
        if (socket.connected) {
            setIsValidating(true);
            socket.emit("session-validate");
        }

        // Setup event listeners
        socket.on('connect', onSocketConnect);
        socket.on('disconnect', onSocketDisconnect);
        socket.on('session-validate-result', onSessionValidateResult);

        return () => {
            socket.off('connect', onSocketConnect);
            socket.off('disconnect', onSocketDisconnect);
            socket.off('session-validate-result', onSessionValidateResult);
        };
    }, []);

    if (!connected) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    p: 2
                }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                            maxWidth: 450,
                            textAlign: 'center',
                            // background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}>
                        <motion.div
                            animate={{
                                y: [0, -10, 0],
                                scale: [1, 1.05, 1]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatDelay: 1
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: alpha(theme.palette.error.main, 0.1)
                                }}>
                                <WifiOff size={40} color={theme.palette.error.main} />
                            </Box>
                        </motion.div>

                        <Box>
                            <Typography variant="h5" gutterBottom fontWeight="700">
                                Connection Lost
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Unable to establish a connection with our servers.
                            </Typography>
                            {retryCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    Attempt {retryCount} failed. Please check your connection.
                                </Typography>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => window.location.reload()}
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        flex: 1
                                    }}>
                                    Refresh Page
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<RefreshCw size={20} />}
                                    onClick={restartSocket}
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        flex: 1,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                    }}>
                                    Reconnect
                                </Button>
                            </motion.div>
                        </Stack>

                        <Box sx={{ mt: 2, width: '100%' }}>
                            <Typography variant="caption" color="text.secondary">
                                Troubleshooting tips:
                            </Typography>
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Server size={14} style={{ marginRight: 8 }} />
                                    <Typography variant="caption">Check if you're online</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AlertCircle size={14} style={{ marginRight: 8 }} />
                                    <Typography variant="caption">Disable VPN or proxy if used</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <RefreshCw size={14} style={{ marginRight: 8 }} />
                                    <Typography variant="caption">Restart your router if needed</Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Paper>
                </motion.div>
            </Box>
        );
    }

    return (
        <SessionManagerContext.Provider value={value}>
            {children}
            {isValidating && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'all', zIndex: 9999 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '100vh',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                            p: 2
                        }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 3,
                                    minWidth: 300,
                                    maxWidth: 400,
                                    // background: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 3,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                }}>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                                    <CircularProgress
                                        size={40}
                                        thickness={4}
                                        sx={{ color: theme.palette.primary.main }}
                                    />
                                </motion.div>

                                <Box textAlign="center">
                                    <Typography variant="h6" fontWeight="600" gutterBottom>
                                        Validating Session
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Please wait while we verify your session details
                                    </Typography>
                                </Box>

                                <Box sx={{ width: '100%', mt: 1 }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{
                                            height: 4,
                                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                            borderRadius: 2
                                        }}
                                    />
                                </Box>
                            </Paper>
                        </motion.div>
                    </Box>
                </Box>
            )}
        </SessionManagerContext.Provider>
    );
};





export const useSessionManager = () => {
    const context = useContext(SessionManagerContext);
    if (!context) throw new Error('useSessionManager must be used within a SessionManagerProvider');
    return context;
};

// Enhanced Connection Status Badge
export const ConnectionStatusBadge = () => {
    const { connected, userId } = useSessionManager();
    const theme = useTheme();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={connected ? 'connected' : 'disconnected'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}>
                <Paper
                    elevation={2}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1,
                        borderRadius: 4,
                        bgcolor: connected
                            ? alpha(theme.palette.success.main, 0.1)
                            : alpha(theme.palette.error.main, 0.1),
                        color: connected
                            ? theme.palette.success.dark
                            : theme.palette.error.dark,
                        border: `1px solid ${connected
                            ? alpha(theme.palette.success.main, 0.2)
                            : alpha(theme.palette.error.main, 0.2)}`,
                        backdropFilter: 'blur(6px)'
                    }}>
                    {connected ? (
                        <>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}>
                                <CheckCircle size={16} />
                            </motion.div>
                            <Typography variant="caption" fontWeight="600">
                                {userId ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <User size={12} />
                                        {userId}
                                    </Box>
                                ) : 'Connected'}
                            </Typography>
                        </>
                    ) : (
                        <>
                            <motion.div
                                animate={{ rotate: [0, -10, 0, 10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}>
                                <AlertCircle size={16} />
                            </motion.div>
                            <Typography variant="caption" fontWeight="600">
                                Disconnected
                            </Typography>
                        </>
                    )}
                </Paper>
            </motion.div>
        </AnimatePresence>
    );
};