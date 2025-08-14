'use client'

import useDarkMode from '@/components/hooks/useDarkMode';
import Ediska from '@/components/icon/Ediska';
import { getColor } from '@/theme/colors';
import { Container, Typography, Box, Stack, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { Cloud, HardDrive, Share2 } from 'lucide-react';

export default function AboutPage() {

    const dark = useDarkMode();

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}>
                <Box sx={{
                    background: getColor("primary")[dark ? 700 : 100],
                    display: 'inline-block',
                    p: 1,
                    borderRadius: 2
                }}>
                    <Ediska width={'5rem'} height={"4rem"} fill={getColor("primary")[dark ? 300 : 400]} />
                </Box>
            </motion.div>

            {/* Judul */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                    Tentang SiMADiS
                </Typography>
            </motion.div>

            {/* Deskripsi */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}>
                <Typography variant="body1" color="text.secondary" component={"p"}>
                    <strong>SiMADiS</strong> adalah singkatan dari <em>Sistem MAN 2 Data & Storage</em>.
                    Aplikasi ini dikembangkan khusus untuk <strong>MAN 2 Kota Pekanbaru</strong> sebagai
                    solusi penyimpanan dan pengelolaan dokumen digital.
                    Dengan antarmuka yang modern dan mudah digunakan, <strong>SiMADiS</strong> memudahkan guru, staf, dan siswa
                    dalam mengatur, mencari, dan berbagi file secara aman di lingkungan sekolah.
                </Typography>
            </motion.div>

            {/* Fitur */}
            <Stack spacing={3} sx={{ mt: 4 }}>
                <FeatureItem
                    icon={<Cloud size={28} />}
                    title="Akses Cloud Lokal"
                    desc="Penyimpanan data di server lokal sekolah dengan keamanan tinggi dan performa optimal."
                    delay={0.3}
                />
                <FeatureItem
                    icon={<HardDrive size={28} />}
                    title="Manajemen Folder & File"
                    desc="Buat, atur, dan kelola folder serta file dengan sistem hak akses yang fleksibel."
                    delay={0.4}
                />
                <FeatureItem
                    icon={<Share2 size={28} />}
                    title="Berbagi Dokumen"
                    desc="Bagikan file ke guru, siswa, atau seluruh sekolah dengan kontrol akses yang mudah."
                    delay={0.5}
                />
            </Stack>
        </Container>
    );
}

function FeatureItem({
    icon,
    title,
    desc,
    delay
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4 }}>
            <Paper sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box color="primary.main">{icon}</Box>
                <Box>
                    <Typography variant="h6" fontWeight="bold">
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {desc}
                    </Typography>
                </Box>
            </Paper>
        </motion.div>
    );
}
