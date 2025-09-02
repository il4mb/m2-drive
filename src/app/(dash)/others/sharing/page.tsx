'use client';

import Container from '@/components/Container';
import StickyHeader from '@/components/StickyHeader';
import { useSharing } from '@/hooks/useFileSharing';
import { LinearProgress, Paper, Stack, Typography, Box, Divider } from '@mui/material';
import { Share2 } from 'lucide-react';
import { motion } from "motion/react";
import FileView from '@/components/drive/FileView';

export default function Page() {
    
    const { fromMe, toMe, loading } = useSharing();
    const isLoading = loading.fromMe || loading.toMe;

    const renderList = (items: typeof fromMe, emptyMessage: string) => (
        <Stack spacing={1} mt={1}>
            {items.length > 0 ? (
                items.map((c, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ delay: 0.05 * i }}
                        key={c.id}>
                        <FileView menu={[]} menuState={{}} size={26} file={c.file} />
                    </motion.div>
                ))
            ) : (
                <Box
                    py={3}
                    px={2}
                    borderRadius={2}
                    bgcolor="action.hover"
                    textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                        {emptyMessage}
                    </Typography>
                </Box>
            )}
        </Stack>
    );

    return (
        <Container maxWidth="lg" scrollable>
            <StickyHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between" position="relative">
                    <Stack alignItems="center" spacing={1} direction="row">
                        <Share2 size={20} />
                        <Typography fontWeight={600} fontSize={18}>
                            Berbagi File
                        </Typography>
                    </Stack>
                    {isLoading && (
                        <LinearProgress
                            sx={{
                                position: 'absolute',
                                bottom: -10,
                                left: 0,
                                width: '100%',
                                height: 2
                            }}
                        />
                    )}
                </Stack>
            </StickyHeader>

            <Paper
                component={Stack}
                spacing={4}
                sx={{
                    p: 2,
                    borderRadius: 2,
                    boxShadow: 2,
                    minHeight: 'max(600px, 85vh)',
                    position: 'relative',
                    bgcolor: 'background.paper'
                }}>
                <Box>
                    <Typography fontSize={16} fontWeight={600}>
                        Yang Saya Bagikan
                    </Typography>
                    <Stack p={2}>
                        {renderList(fromMe, 'Belum ada file yang Anda bagikan.')}
                    </Stack>
                </Box>
                <Divider />
                <Box>
                    <Typography fontSize={16} fontWeight={600}>
                        Yang Dibagikan Ke Saya
                    </Typography>
                    <Stack p={2}>
                        {renderList(toMe, 'Belum ada file yang dibagikan ke Anda.')}
                    </Stack>
                </Box>
            </Paper>
        </Container>
    );
}
