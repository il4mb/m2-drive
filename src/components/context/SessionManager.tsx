'use client'

import { SocketResult } from '@/server/socketHandlers';
import { socket } from '@/socket';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Fade,
    Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    WifiOff,
    RefreshCw,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

interface SessionManagerState {
    userId: string | null;
    connected: boolean;
    isValidating: boolean;
}

const SessionManagerContext = createContext<SessionManagerState | undefined>(undefined);

type SessionManagerProps = {
    children?: ReactNode;
}

export const SessionManager = ({ children }: SessionManagerProps) => {

    const [connected, setConnected] = useState(socket.connected);
    const [userId, setUserId] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        const onSocketConnect = () => {
            setConnected(true);
            setIsValidating(true);
            socket.emit("session-validate");
        };

        const onSocketDisconnect = () => {
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

    // Show loading state during validation
    if (isValidating) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: 'background.default'
                }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            minWidth: 300
                        }}>
                        <CircularProgress size={40} />
                        <Typography variant="h6" color="text.secondary">
                            Validating Session...
                        </Typography>
                    </Paper>
                </motion.div>
            </Box>
        );
    }

    if (!connected) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    p: 2,
                    flex: 1
                }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                            maxWidth: 400,
                            textAlign: 'center'
                        }}>
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}>
                            <WifiOff size={64} color="#f44336" />
                        </motion.div>

                        <Box>
                            <Typography variant="h5" gutterBottom fontWeight="bold">
                                Connection Lost
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Unable to connect to the server. Please check your internet connection and try again.
                            </Typography>
                        </Box>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<RefreshCw size={20} />}
                                onClick={() => window.location.reload()}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1
                                }}>
                                Reconnect
                            </Button>
                        </motion.div>
                    </Paper>
                </motion.div>
            </Box>
        );
    }

    return (
        <SessionManagerContext.Provider value={{ userId, connected, isValidating }}>
            {children}
        </SessionManagerContext.Provider>
    );
};

export const useSessionManager = () => {
    const context = useContext(SessionManagerContext);
    if (!context) throw new Error('useSessionManager must be used within a SessionManagerProvider');
    return context;
};

// Optional: Component to display connection status badge
export const ConnectionStatusBadge = () => {
    const { connected, userId } = useSessionManager();

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}>
            <Paper
                elevation={1}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 3,
                    bgcolor: connected ? 'success.light' : 'error.light',
                    color: 'white'
                }}>
                {connected ? (
                    <>
                        <CheckCircle size={16} />
                        <Typography variant="caption" fontWeight="medium">
                            {userId ? `Connected as ${userId}` : 'Connected'}
                        </Typography>
                    </>
                ) : (
                    <>
                        <AlertCircle size={16} />
                        <Typography variant="caption" fontWeight="medium">
                            Disconnected
                        </Typography>
                    </>
                )}
            </Paper>
        </motion.div>
    );
};