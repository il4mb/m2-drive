'use client'

import Container from '@/components/Container';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import { useMyAbilities } from '@/components/context/CurrentUserAbilitiesProvider';
import UserAvatar from '@/components/ui/UserAvatar';
import { currentTime, formatLocaleDate, toRelativeTimeFrom } from '@/libs/utils';
import { Button, Paper, Stack, Typography, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { Cookie } from 'lucide-react';

export default function Page() {
    const session = useCurrentSession();
    const { permissions, role } = useMyAbilities();

    if (!session?.user) return null;

    const { user, refreshToken, createdAt, expiredAt } = session;

    return (
        <Container scrollable>
            <Stack flex={1} justifyContent="center" alignItems="center" sx={{ minHeight: '100vh' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%' }}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            borderRadius: 3,
                            maxWidth: 600,
                            mx: 'auto',
                            background: 'background.paper'
                        }}
                        component={motion.div}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 300 }}>
                        {/* User Info */}
                        <Stack alignItems="center" spacing={1} mb={3} sx={{ position: 'relative' }}>
                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                <UserAvatar
                                    userId={user.id}
                                    size={60}
                                    sx={{ width: 100, height: 100, border: '3px solid', borderColor: 'primary.main' }}
                                />
                            </motion.div>
                            <Typography fontSize={22} fontWeight={700}>{user.name}</Typography>
                            <Typography fontSize={14} color="text.secondary">{user.email}</Typography>
                            <Typography
                                fontSize={16}
                                color='primary'
                                fontWeight={800}
                                sx={{ position: "absolute", top: -20, right: -10, }}>
                                {role?.label}
                            </Typography>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        {/* Session Info */}
                        <Stack spacing={0.5} mb={3}>
                            <Stack direction={"row"} gap={1} alignItems={"center"}>
                                <Cookie size={18} />
                                <Typography fontSize={16} fontWeight={600}>Informasi Sesi</Typography>
                            </Stack>
                            <Stack pl={3}>
                                <Typography color="text.secondary">
                                    Dibuat: {formatLocaleDate(createdAt || 0)}
                                </Typography>
                                <Typography color="text.secondary">
                                    Berakhir: {toRelativeTimeFrom(expiredAt || 0, currentTime())}
                                </Typography>
                                <motion.div whileTap={{ scale: 0.95 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        sx={{ mt: 1, alignSelf: 'flex-start', textTransform: 'none' }}
                                        onClick={refreshToken}>
                                        Segarkan Sesi
                                    </Button>
                                </motion.div>
                            </Stack>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        {/* Role & Permissions */}
                        <Stack spacing={0.5}>
                            <Typography fontSize={16} fontWeight={600}>Jabatan: {role?.label}</Typography>
                            {permissions.map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * i }}>
                                    <Typography variant="body2" color="text.secondary">
                                        • {p.label}
                                    </Typography>
                                </motion.div>
                            ))}
                        </Stack>
                    </Paper>
                </motion.div>
            </Stack>
        </Container>
    );
}
