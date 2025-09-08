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
    Stack
} from '@mui/material';
import { io, Socket } from 'socket.io-client';
import { Ban, BarChart, Blocks, Info, RefreshCcw, Tv, Users2, X } from 'lucide-react';
import StickyHeader from '@/components/navigation/StickyHeader';
import MobileAction from '@/components/navigation/MobileAction';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';

interface ConnectionMetrics {
    totalConnections: number;
    activeConnections: number;
    maxConcurrentConnections: number;
    functionInvocations: number;
    queryExecutions: number;
    guestConnections: number;
    activeUsers: number;
    guestUsers: number;
    rooms: number;
    subscriptions: number;
}

interface RoomInfo {
    id: string;
    users: Record<string, any>;
    createdAt: number;
    updatedAt?: number;
    isPublic: boolean;
    maxUsers: number;
    createdBy?: string;
}

interface ViewerInfo {
    uid: string | null;
    isGuest: boolean;
    displayName: string;
    path: string[][];
}

interface ActiveUser {
    socketId: string;
    userId: string;
    joinedAt: number;
    isGuest: boolean;
    displayName: string;
}

export default function SocketMetricsDashboard() {

    const { addAction, updateActionProps } = useActionsProvider();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [viewers, setViewers] = useState<ViewerInfo[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io();

        newSocket.on('connect', () => {
            console.log('Connected to server');
            setLoading(false);
            fetchMetrics();
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setError('Disconnected from server');
        });

        newSocket.on('error', (err) => {
            console.error('Socket error:', err);
            setError(err.message || 'Socket connection error');
        });

        newSocket.on('metrics-update', (data: ConnectionMetrics) => {
            setMetrics(data);
        });

        newSocket.on('rooms-update', (data: RoomInfo[]) => {
            setRooms(data);
        });

        newSocket.on('viewers-update', (data: ViewerInfo[]) => {
            setViewers(data);
        });

        newSocket.on('active-users-update', (data: ActiveUser[]) => {
            setActiveUsers(data);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const fetchMetrics = () => {
        if (socket) {
            socket.emit('get-metrics', (response: any) => {
                if (response.success) {
                    setMetrics(response.data);
                } else {
                    setError(response.error);
                }
            });

            socket.emit('get-rooms', (response: any) => {
                if (response.success) {
                    setRooms(response.data);
                }
            });

            socket.emit('get-viewers', (response: any) => {
                if (response.success) {
                    setViewers(response.data);
                }
            });

            socket.emit('get-active-users', (response: any) => {
                if (response.success) {
                    setActiveUsers(response.data);
                }
            });
        }
    };

    useEffect(() => {
        if (autoRefresh && socket) {
            const interval = setInterval(fetchMetrics, 5000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, socket]);

    const handleKickUser = (socketId: string) => {
        if (socket) {
            socket.emit('admin-kick-user', { socketId }, (response: any) => {
                if (response.success) {
                    fetchMetrics();
                } else {
                    setError(response.error);
                }
            });
        }
    };

    const handleDeleteRoom = (roomId: string) => {
        if (socket) {
            socket.emit('admin-delete-room', { roomId }, (response: any) => {
                if (response.success) {
                    fetchMetrics();
                    setSelectedRoom(null);
                } else {
                    setError(response.error);
                }
            });
        }
    };

    const handleClearSubscriptions = () => {
        if (socket) {
            socket.emit('admin-clear-subscriptions', (response: any) => {
                if (response.success) {
                    fetchMetrics();
                } else {
                    setError(response.error);
                }
            });
        }
    };


    useEffect(() => {
        const removers = [
            addAction('toggle', {
                component: ({ autoRefresh }) => (
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
                        onClick={fetchMetrics}
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
    }, [autoRefresh])

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
        <Box sx={{ p: 3 }}>
            <StickyHeader>
                <Stack direction={"row"} alignItems={"center"} spacing={1}>
                    <Typography variant="h4" component="h1">
                        Socket.io Metrics
                    </Typography>
                </Stack>
            </StickyHeader>

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
                                    {metrics.activeConnections}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Active / {metrics.totalConnections} Total
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Max: {metrics.maxConcurrentConnections}
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
                                    {metrics.functionInvocations + metrics.queryExecutions}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {metrics.functionInvocations} Functions
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {metrics.queryExecutions} Queries
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Box component={Blocks} color="success" sx={{ mr: 1 }} />
                                    <Typography color="textSecondary" gutterBottom>
                                        Rooms
                                    </Typography>
                                </Box>
                                <Typography variant="h4" component="div">
                                    {metrics.rooms}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {metrics.activeUsers} Users
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {metrics.guestUsers} Guests
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
                                    {metrics.subscriptions}
                                </Typography>
                                <Button
                                    size="small"
                                    color="warning"
                                    onClick={handleClearSubscriptions}
                                    sx={{ mt: 1 }}
                                >
                                    Clear All
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tabs for different sections */}
            <Paper sx={{ width: '100%' }}>
                <Tabs
                    value={selectedTab}
                    onChange={(_, newValue) => setSelectedTab(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label="Active Users" />
                    <Tab label="Rooms" />
                    <Tab label="Viewers" />
                    <Tab label="Admin Actions" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {selectedTab === 0 && (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User ID</TableCell>
                                        <TableCell>Display Name</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Joined At</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {activeUsers.map((user) => (
                                        <TableRow key={user.socketId}>
                                            <TableCell>{user.userId}</TableCell>
                                            <TableCell>{user.displayName}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={user.isGuest ? 'Guest' : 'Authenticated'}
                                                    color={user.isGuest ? 'default' : 'primary'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.joinedAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleKickUser(user.socketId)}
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
                                        <TableCell>Room ID</TableCell>
                                        <TableCell>Users</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Created</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rooms.map((room) => (
                                        <TableRow key={room.id}>
                                            <TableCell>{room.id}</TableCell>
                                            <TableCell>{Object.keys(room.users || {}).length}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={room.isPublic ? 'Public' : 'Private'}
                                                    color={room.isPublic ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(room.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    color="info"
                                                    onClick={() => setSelectedRoom(room)}
                                                    size="small"
                                                >
                                                    <Box component={Info} />
                                                </IconButton>
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDeleteRoom(room.id)}
                                                    size="small"
                                                    sx={{ ml: 1 }}
                                                >
                                                    <Box component={X} />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {selectedTab === 2 && (
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
                                                socket?.emit('admin-disconnect-guests');
                                            }}
                                        >
                                            Disconnect All Guests
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            fullWidth
                                            onClick={() => {
                                                socket?.emit('admin-disconnect-all');
                                            }}
                                        >
                                            Disconnect All Users
                                        </Button>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Room Management
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            fullWidth
                                            onClick={() => {
                                                socket?.emit('admin-clear-rooms');
                                            }}
                                        >
                                            Clear All Rooms
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
                                                socket?.emit('admin-reload-functions');
                                            }}
                                        >
                                            Reload Functions
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            fullWidth
                                            onClick={() => {
                                                socket?.emit('admin-clear-metrics');
                                            }}
                                        >
                                            Reset Metrics
                                        </Button>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Room Detail Dialog */}
            <Dialog
                open={!!selectedRoom}
                onClose={() => setSelectedRoom(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Room Details: {selectedRoom?.id}
                </DialogTitle>
                <DialogContent>
                    {selectedRoom && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                <strong>Created:</strong> {new Date(selectedRoom.createdAt).toLocaleString()}
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                <strong>Type:</strong> {selectedRoom.isPublic ? 'Public' : 'Private'}
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                <strong>Capacity:</strong> {Object.keys(selectedRoom.users || {}).length} / {selectedRoom.maxUsers}
                            </Typography>
                            <Typography variant="h6" sx={{ mt: 2 }}>
                                Users in Room:
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>User ID</TableCell>
                                            <TableCell>Display Name</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Joined</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(selectedRoom.users || {}).map(([socketId, user]) => (
                                            <TableRow key={socketId}>
                                                <TableCell>{user.userId}</TableCell>
                                                <TableCell>{user.displayName}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.isGuest ? 'Guest' : 'User'}
                                                        size="small"
                                                        color={user.isGuest ? 'default' : 'primary'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(user.joinedAt).toLocaleTimeString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedRoom(null)}>Close</Button>
                    <Button
                        color="error"
                        onClick={() => selectedRoom && handleDeleteRoom(selectedRoom.id)}
                    >
                        Delete Room
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}