'use client'

import Container from '@/components/Container';
import useDarkMode from '@/hooks/useDarkMode';
import { Typography, Box, Stack, Paper, Chip, LinearProgress, Avatar, IconButton, Badge } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, HardDrive, Share2, Server, Users, Clock, CheckCircle, XCircle, RefreshCw, MoreVertical, FileText, Upload, Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';

// Mock data interfaces
interface Activity {
    id: string;
    type: 'upload' | 'download' | 'share' | 'delete';
    user: string;
    action: string;
    timestamp: Date;
    status: 'completed' | 'processing' | 'failed';
}

interface Task {
    id: string;
    name: string;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    estimatedTime?: string;
    user?: string;
}

export default function AboutPage() {
    const dark = useDarkMode();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Mock real-time data updates
    useEffect(() => {
        const initialActivities: Activity[] = [
            {
                id: '1',
                type: 'upload',
                user: 'guru@man2pekanbaru.sch.id',
                action: 'Mengupload RPP Matematika',
                timestamp: new Date(Date.now() - 1000 * 60 * 2),
                status: 'completed'
            },
            {
                id: '2',
                type: 'share',
                user: 'admin@man2pekanbaru.sch.id',
                action: 'Membagikan dokumen rapat',
                timestamp: new Date(Date.now() - 1000 * 60 * 5),
                status: 'completed'
            },
            {
                id: '3',
                type: 'download',
                user: 'siswa@man2pekanbaru.sch.id',
                action: 'Mengunduh materi pelajaran',
                timestamp: new Date(Date.now() - 1000 * 60 * 8),
                status: 'processing'
            }
        ];

        const initialTasks: Task[] = [
            {
                id: '1',
                name: 'Backup database harian',
                progress: 75,
                status: 'processing',
                estimatedTime: '2 menit',
                user: 'System'
            },
            {
                id: '2',
                name: 'Indexing file baru',
                progress: 30,
                status: 'processing',
                estimatedTime: '1 menit',
                user: 'System'
            },
            {
                id: '3',
                name: 'Compress file lama',
                progress: 0,
                status: 'pending',
                estimatedTime: '5 menit',
                user: 'System'
            }
        ];

        setActivities(initialActivities);
        setTasks(initialTasks);

        // Simulate real-time updates
        const interval = setInterval(() => {
            setActivities(prev => {
                const newActivity: Activity = {
                    id: Date.now().toString(),
                    type: ['upload', 'download', 'share', 'delete'][Math.floor(Math.random() * 4)] as any,
                    user: ['guru@man2pekanbaru.sch.id', 'admin@man2pekanbaru.sch.id', 'siswa@man2pekanbaru.sch.id'][Math.floor(Math.random() * 3)],
                    action: ['Mengupload file', 'Mengunduh dokumen', 'Membagikan folder', 'Menghapus file'][Math.floor(Math.random() * 4)],
                    timestamp: new Date(),
                    status: 'completed'
                };
                return [newActivity, ...prev.slice(0, 4)];
            });

            setTasks(prev => prev.map(task =>
                task.status === 'processing'
                    ? { ...task, progress: Math.min(100, task.progress + 10) }
                    : task
            ));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const getActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'upload': return <Upload size={16} />;
            case 'download': return <Download size={16} />;
            case 'share': return <Share size={16} />;
            case 'delete': return <XCircle size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const getStatusColor = (status: Activity['status'] | Task['status']) => {
        switch (status) {
            case 'completed': return 'success';
            case 'processing': return 'primary';
            case 'failed': return 'error';
            case 'pending': return 'default';
            default: return 'default';
        }
    };

    return (
        <Container maxWidth={"lg"} sx={{ py: 6 }} scrollable>
            <Stack spacing={4}>
                {/* Main Info Section */}
                <Paper sx={{ borderRadius: 3, p: [3, 4, 5], background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}>
                        <Typography variant="h2" fontWeight="bold" gutterBottom>
                            M2 Drive
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                            Platform penyimpanan cloud modern yang dikembangkan khusus untuk{' '}
                            <strong>MAN 2 Kota Pekanbaru</strong>. Memberikan solusi terpadu untuk
                            manajemen dokumen digital dengan keamanan dan performa terbaik.
                        </Typography>
                    </motion.div>
                </Paper>

                {/* Features Grid */}
                <Stack spacing={3}>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Fitur Utama
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                        <FeatureItem
                            icon={<Cloud size={32} />}
                            title="Cloud Lokal"
                            desc="Server lokal sekolah dengan keamanan tinggi dan performa optimal"
                            color="#667eea"
                        />
                        <FeatureItem
                            icon={<HardDrive size={32} />}
                            title="Manajemen File"
                            desc="Sistem pengelolaan file dengan hak akses yang fleksibel"
                            color="#764ba2"
                        />
                        <FeatureItem
                            icon={<Share2 size={32} />}
                            title="Berbagi Dokumen"
                            desc="Kontrol akses yang mudah untuk berbagi file"
                            color="#f093fb"
                        />
                    </Stack>
                </Stack>

                {/* Real-time Dashboard */}
                <Stack spacing={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h4" fontWeight="bold" color="primary">
                            Dashboard Real-time
                        </Typography>
                        <IconButton onClick={handleRefresh} sx={{ color: 'primary.main' }}>
                            <RefreshCw size={20} className={isRefreshing ? 'spin' : ''} />
                        </IconButton>
                    </Box>

                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                        {/* Activities Panel */}
                        <Paper sx={{ borderRadius: 2, p: 3, flex: 1, minWidth: 300 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Users size={20} />
                                <Typography variant="h6" fontWeight="bold">
                                    Aktivitas Terbaru
                                </Typography>
                                <Badge badgeContent={activities.length} color="primary" sx={{ ml: 1 }} />
                            </Box>

                            <Stack spacing={2}>
                                <AnimatePresence>
                                    {activities.map((activity, index) => (
                                        <motion.div
                                            key={activity.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                                    {getActivityIcon(activity.type)}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {activity.action}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {activity.user} • {activity.timestamp.toLocaleTimeString()}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={activity.status}
                                                    size="small"
                                                    color={getStatusColor(activity.status)}
                                                    variant="outlined"
                                                />
                                            </Box>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </Stack>
                        </Paper>

                        {/* Task Queue Panel */}
                        <Paper sx={{ borderRadius: 2, p: 3, flex: 1, minWidth: 300 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Server size={20} />
                                <Typography variant="h6" fontWeight="bold">
                                    Antrian Tugas
                                </Typography>
                                <Chip label="Live" size="small" color="success" variant="outlined" />
                            </Box>

                            <Stack spacing={2}>
                                {tasks.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.2 }}
                                    >
                                        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {task.name}
                                                </Typography>
                                                <Chip
                                                    label={task.status}
                                                    size="small"
                                                    color={getStatusColor(task.status)}
                                                />
                                            </Box>

                                            {task.status === 'processing' && (
                                                <>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={task.progress}
                                                        sx={{ height: 6, borderRadius: 3, mb: 1 }}
                                                    />
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {task.progress}% selesai
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            <Clock size={12} style={{ marginRight: 4 }} />
                                                            {task.estimatedTime}
                                                        </Typography>
                                                    </Box>
                                                </>
                                            )}

                                            {task.user && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    oleh {task.user}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </motion.div>
                                ))}
                            </Stack>
                        </Paper>
                    </Stack>
                </Stack>

                {/* Statistics */}
                <Paper sx={{ borderRadius: 2, p: 3, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} justifyContent="space-around">
                        <StatItem icon={<Cloud size={32} />} value="500GB+" label="Penyimpanan Terpakai" />
                        <StatItem icon={<Users size={32} />} value="1.2K+" label="Pengguna Aktif" />
                        <StatItem icon={<FileText size={32} />} value="25K+" label="File Tersimpan" />
                    </Stack>
                </Paper>
            </Stack>

            <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </Container>
    );
}

function FeatureItem({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color?: string }) {
    return (
        <Stack
            component={motion.div}
            flex={1}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            sx={{
                p: 3,
                flex: 1,
                background: `linear-gradient(135deg, ${color}40 0%, ${color}80 100%)`,
                boxShadow: `0px 0px 1px 2px ${color}AA`,
                backdropFilter: 'blur(8px)',
                borderRadius: 2
            }}>
            <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ color, mb: 2 }}>{icon}</Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {desc}
                </Typography>
            </Box>
        </Stack>
    );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ opacity: 0.8, mb: 1 }}>{icon}</Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                {value}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {label}
            </Typography>
        </Box>
    );
}