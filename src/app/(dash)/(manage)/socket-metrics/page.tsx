'use client'

import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    LinearProgress,
    Tabs,
    Tab,
    Switch,
    FormControlLabel,
    Stack,
    Tooltip,
    TextField
} from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { Ban, BarChart, Blocks, Info, RefreshCcw, Tv, Users2, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import StickyHeader from '@/components/navigation/StickyHeader';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';
import { useMyPermission } from '@/hooks/useMyPermission';
import { socket } from '@/socket';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { useRouter } from 'next/navigation';
import PermissionSuspense from '@/components/PermissionSuspense';
import Container from '@/components/Container';
import { formatDateFromEpoch, formatNumber } from '@/libs/utils';

interface ConnectionMetrics {
    totalConnections: number;
    activeConnections: number;
    maxConcurrentConnections: number;
    functionInvocations: number;
    queryExecutions: number;
    subscriptions: number;
    viewers: number;
}

interface ViewerInfo {
    uid: string | null;
    isGuest: boolean;
    displayName: string;
    path: string[][];
}

interface ActiveUser {
    socketId: string;
    userId: string | null;
    displayName: string;
    isAuthenticated: boolean;
    sessionId: string;
}

interface Subscription {
    id: string;
    collection: string;
    conditions?: any;
    relations: string[];
    debug?: boolean;
    createdAt: number;
    socketId: string;
}

export default function SocketMetricsDashboard() {

    const router = useRouter();
    const canManageSocket = useMyPermission("can-manage-socket-connection");
    const canSeeSocket = useMyPermission("can-see-socket-connection");

    const { addAction, updateActionProps } = useActionsProvider();
    const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
    const [viewers, setViewers] = useState<ViewerInfo[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [kickDialogOpen, setKickDialogOpen] = useState(false);
    const [userToKick, setUserToKick] = useState<string | null>(null);
    const [subscriptionFilter, setSubscriptionFilter] = useState('');

    useEffect(() => {
        fetchAllData();

        const onDisconnect = () => {
            console.log('Disconnected from server');
            setError('Disconnected from server');
        }
        const onError = (err: any) => {
            console.error('Socket error:', err);
            setError(err.message || 'Socket connection error');
        }

        const onMetricsUpdate = (data: ConnectionMetrics) => {
            setMetrics(data);
        }
        const onViewerChange = (data: ViewerInfo[]) => {
            setViewers(data);
        }

        socket.on('disconnect', onDisconnect);
        socket.on('error', onError);
        socket.on('metrics-update', onMetricsUpdate);
        socket.on('viewers-change', onViewerChange);

        return () => {
            socket.off('disconnect', onDisconnect);
            socket.off('error', onError);
            socket.off('metrics-update', onMetricsUpdate);
            socket.off('viewers-change', onViewerChange);
        };
    }, []);

    const fetchAllData = () => {

        // Fetch metrics
        socket.emit('get-metrics', (response: any) => {
            if (response.success) {
                setMetrics(response.data);
                setLoading(false);
            } else {
                setError(response.error);
            }
        });

        // Fetch viewers
        socket.emit('get-viewers', (response: any) => {
            if (response.success) {
                setViewers(response.data);
            } else {
                console.error('Failed to fetch viewers:', response.error);
            }
        });

        // Fetch active users from clients map (simulated)
        fetchActiveUsers();

        // Fetch subscriptions
        fetchSubscriptions();

    };

    const fetchActiveUsers = () => {
        socket.emit('admin-get-active-users', (response: any) => {
            if (response.success) {
                setActiveUsers(response.data);
            } else {
                console.error('Failed to fetch active users:', response.error);
            }
        });
    };

    const fetchSubscriptions = () => {
        socket.emit('admin-get-subscriptions', (response: any) => {
            if (response.success) {
                setSubscriptions(response.data);
            } else {
                console.error('Failed to fetch subscriptions:', response.error);
            }
        });
    };

    useEffect(() => {
        if (autoRefresh && socket) {
            const interval = setInterval(fetchAllData, 5000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, socket]);

    const handleKickUser = (socketId: string) => {
        if (!canManageSocket) {
            return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                variant: "error",
                action: CloseSnackbar
            })
        }
        socket.emit('admin-kick-user', { socketId }, (response: any) => {
            if (response.success) {
                fetchAllData();
                setKickDialogOpen(false);
                setUserToKick(null);
            } else {
                setError(response.error);
            }
        });
    };

    const handleClearSubscriptions = () => {
        if (!canManageSocket) {
            return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                variant: "error",
                action: CloseSnackbar
            })
        }
        socket.emit('admin-clear-subscriptions', (response: any) => {
            if (response.success) {
                fetchSubscriptions();
            } else {
                setError(response.error);
            }
        })
    };

    const handleRemoveSubscription = (id: string) => {
        if (!canManageSocket) {
            return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                variant: "error",
                action: CloseSnackbar
            })
        }
        socket.emit('admin-remove-subscription', { id }, (response: any) => {
            if (response.success) {
                fetchSubscriptions();
            } else {
                setError(response.error);
            }
        });

    };

    const openKickDialog = (socketId: string) => {
        setUserToKick(socketId);
        setKickDialogOpen(true);
    };

    const closeKickDialog = () => {
        setKickDialogOpen(false);
        setUserToKick(null);
    };

    useEffect(() => {
        const removers = [
            addAction('toggle', {
                component: ({ autoRefresh }: any) => (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Auto Refresh"
                    />
                ),
                icon: undefined
            }),
            addAction('refresh', {
                component: () => (
                    <Button
                        variant="contained"
                        startIcon={<RefreshCcw />}
                        onClick={fetchAllData}
                        sx={{ ml: 2 }}>
                        Refresh
                    </Button>
                ),
                icon: undefined
            })
        ];

        return () => { removers.map(r => r()) }
    }, []);

    useEffect(() => {
        updateActionProps("toggle", { autoRefresh })
    }, [autoRefresh]);

    const filteredSubscriptions = subscriptionFilter
        ? subscriptions.filter(sub =>
            sub.collection.toLowerCase().includes(subscriptionFilter.toLowerCase()) ||
            sub.socketId.toLowerCase().includes(subscriptionFilter.toLowerCase()))
        : subscriptions;

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Box width="80%">
                    <LinearProgress />
                    <Typography variant="h6" align="center" sx={{ mt: 2 }}>
                        Connecting to Socket.io server...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Container maxWidth={"lg"} scrollable>
            <StickyHeader>
                <Stack alignItems={"center"}>
                    <Typography variant="h4" component="h1">
                        Socket.io Metrics Dashboard
                    </Typography>
                </Stack>
            </StickyHeader>

            {!canManageSocket && (
                <Alert severity={'warning'} sx={{ mb: 2 }}>Kamu dalam mode <strong>Read Only.</strong></Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Metrics Cards */}
            {metrics && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Box component={Users2} color="primary" sx={{ mr: 1 }} />
                                    <Typography color="textSecondary" gutterBottom>
                                        Connections
                                    </Typography>
                                </Box>
                                <Typography variant="h4" component="div">
                                    {formatNumber(metrics.activeConnections)}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Active / {formatNumber(metrics.totalConnections)} Total
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Max: {formatNumber(metrics.maxConcurrentConnections)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Box component={BarChart} color="secondary" sx={{ mr: 1 }} />
                                    <Typography color="textSecondary" gutterBottom>
                                        Operations
                                    </Typography>
                                </Box>
                                <Typography variant="h4" component="div">
                                    {formatNumber(metrics.functionInvocations + metrics.queryExecutions)}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {formatNumber(metrics.functionInvocations)} Functions
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {formatNumber(metrics.queryExecutions)} Queries
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Box component={Tv} color="warning" sx={{ mr: 1 }} />
                                    <Typography color="textSecondary" gutterBottom>
                                        Subscriptions
                                    </Typography>
                                </Box>
                                <Typography variant="h4" component="div">
                                    {formatNumber(metrics.subscriptions)}
                                </Typography>
                                <Button
                                    size="small"
                                    color="warning"
                                    onClick={handleClearSubscriptions}
                                    sx={{ mt: 1 }}>
                                    Clear All
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Box component={Eye} color="info" sx={{ mr: 1 }} />
                                    <Typography color="textSecondary" gutterBottom>
                                        Viewers
                                    </Typography>
                                </Box>
                                <Typography variant="h4" component="div">
                                    {formatNumber(metrics.viewers)}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Tracking {formatNumber(viewers.length)} active viewers
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tabs for different sections */}
            <Stack component={Paper} flex={1} sx={{ width: '100%' }}>
                <Tabs
                    value={selectedTab}
                    onChange={(_, newValue) => setSelectedTab(newValue)}
                    indicatorColor="primary"
                    textColor="primary">
                    <Tab label="Active Connections" />
                    <Tab label="Viewers" />
                    <Tab label="Subscriptions" />
                    <Tab label="Admin Actions" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {selectedTab === 0 && (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Socket ID</TableCell>
                                        <TableCell>User ID</TableCell>
                                        <TableCell>Display Name</TableCell>
                                        <TableCell>Session ID</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {activeUsers.map((user) => (
                                        <TableRow key={user.socketId}>
                                            <TableCell>
                                                <Tooltip title={user.socketId}>
                                                    <span>{user.socketId.substring(0, 8)}...</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>{user.userId || 'Guest'}</TableCell>
                                            <TableCell>{user.displayName}</TableCell>
                                            <TableCell>
                                                <Tooltip title={user.sessionId}>
                                                    <span>{user.sessionId.substring(0, 8)}...</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={user.socketId == socket.id ? "Kamu (Authenticated)" : user.isAuthenticated ? 'Authenticated' : 'Guest'}
                                                    color={user.isAuthenticated ? 'primary' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    color="error"
                                                    onClick={() => openKickDialog(user.socketId)}
                                                    size="small">
                                                    <Box component={Ban} />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {selectedTab === 1 && (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User ID</TableCell>
                                        <TableCell>Display Name</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Paths</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {viewers.map((viewer, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{viewer.uid || 'N/A'}</TableCell>
                                            <TableCell>{viewer.displayName}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={viewer.isGuest ? 'Guest' : 'Authenticated'}
                                                    color={viewer.isGuest ? 'default' : 'primary'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {viewer.path.map((path, i) => (
                                                    <Chip
                                                        key={i}
                                                        label={path.join(' > ')}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ m: 0.5 }}
                                                    />
                                                ))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {selectedTab === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">
                                    Active Subscriptions ({subscriptions.length})
                                </Typography>
                                <TextField
                                    placeholder="Filter subscriptions..."
                                    size="small"
                                    value={subscriptionFilter}
                                    onChange={(e) => setSubscriptionFilter(e.target.value)}
                                    sx={{ width: 250 }}
                                />
                            </Box>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ID</TableCell>
                                            <TableCell>Collection</TableCell>
                                            <TableCell>Socket ID</TableCell>
                                            <TableCell>Relations</TableCell>
                                            <TableCell>Created</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSubscriptions.map((sub) => (
                                            <TableRow key={sub.id}>
                                                <TableCell>
                                                    <Tooltip title={sub.id}>
                                                        <span>{sub.id.substring(0, 8)}...</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{sub.collection}</TableCell>
                                                <TableCell>
                                                    <Tooltip title={sub.socketId}>
                                                        <span>{sub.socketId.substring(0, 8)}...</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    {sub.relations.join(', ') || 'None'}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateFromEpoch(sub.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleRemoveSubscription(sub.id)}
                                                        size="small">
                                                        <Box component={Trash2} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {selectedTab === 3 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Administrative Actions
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Connection Management
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="warning"
                                            fullWidth
                                            sx={{ mb: 1 }}
                                            onClick={() => {
                                                if (!canManageSocket) {
                                                    return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                                                        variant: "error",
                                                        action: CloseSnackbar
                                                    })
                                                }
                                                socket?.emit('admin-disconnect-guests', (response: any) => {
                                                    if (response.success) {
                                                        fetchAllData();
                                                    } else {
                                                        setError(response.error);
                                                    }
                                                });
                                            }}>
                                            Disconnect All Guests
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            fullWidth
                                            onClick={() => {
                                                if (!canManageSocket) {
                                                    return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                                                        variant: "error",
                                                        action: CloseSnackbar
                                                    })
                                                }
                                                socket?.emit('admin-disconnect-all', (response: any) => {
                                                    if (response.success) {
                                                        fetchAllData();
                                                    } else {
                                                        setError(response.error);
                                                    }
                                                });
                                            }}>
                                            Disconnect All Users
                                        </Button>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Data Management
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="warning"
                                            fullWidth
                                            sx={{ mb: 1 }}
                                            onClick={handleClearSubscriptions}>
                                            Clear All Subscriptions
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            fullWidth
                                            onClick={() => {
                                                if (!canManageSocket) {
                                                    return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                                                        variant: "error",
                                                        action: CloseSnackbar
                                                    })
                                                }
                                                socket?.emit('admin-clear-metrics', (response: any) => {
                                                    if (response.success) {
                                                        fetchAllData();
                                                    } else {
                                                        setError(response.error);
                                                    }
                                                });
                                            }}>
                                            Reset Metrics
                                        </Button>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            System Control
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="info"
                                            fullWidth
                                            sx={{ mb: 1 }}
                                            onClick={() => {
                                                if (!canManageSocket) {
                                                    return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                                                        variant: "error",
                                                        action: CloseSnackbar
                                                    })
                                                }
                                                socket?.emit('admin-reload-functions', (response: any) => {
                                                    if (response.success) {
                                                        setError(null);
                                                        alert('Functions reloaded successfully');
                                                    } else {
                                                        setError(response.error);
                                                    }
                                                });
                                            }}>
                                            Reload Functions
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            fullWidth
                                            onClick={() => {
                                                if (!canManageSocket) {
                                                    return enqueueSnackbar("Kamu tidak dapat membuat tindakan!", {
                                                        variant: "error",
                                                        action: CloseSnackbar
                                                    })
                                                }
                                                socket?.emit('admin-clear-rate-limits', (response: any) => {
                                                    if (response.success) {
                                                        setError(null);
                                                        alert('Rate limits cleared successfully');
                                                    } else {
                                                        setError(response.error);
                                                    }
                                                });
                                            }}>
                                            Clear Rate Limits
                                        </Button>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Stack>

            {/* Kick User Dialog */}
            <Dialog open={kickDialogOpen} onClose={closeKickDialog}>
                <DialogTitle>Confirm Kick User</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to kick this user? They will be disconnected immediately.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeKickDialog}>Cancel</Button>
                    <Button
                        onClick={() => userToKick && handleKickUser(userToKick)}
                        color="error"
                        variant="contained">
                        Kick User
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}