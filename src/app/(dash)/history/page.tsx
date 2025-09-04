"use client";

import { File } from "@/entity/File";
import {
    Stack,
    Typography,
    Paper,
} from "@mui/material";
import { History, Clock, Upload, Folder } from "lucide-react";
import { motion } from "framer-motion";
import { FileIcon } from "@untitledui/file-icons";
import Container from "@/components/Container";
import { useMyHistory } from "@/hooks/useMyHistory";
import StickyHeader from "@/components/StickyHeader";



type SectionProps = {
    title: string;
    icon: React.ReactNode;
    files: File[];
}

export default function Page() {

    const { files, loading } = useMyHistory();

    const FileCard = ({ file }: { file: File }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
                maxWidth: 200,
                width: "100%"
            }}>
            <Paper
                elevation={2}
                sx={{
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "column",
                    textAlign: "center",
                    gap: 1,
                    width: "100%",
                }}>
                {file.type == "folder"
                    ? <Folder
                        size={28}
                        strokeWidth={1} />
                    : <FileIcon
                        variant="solid"
                        size={28}
                        strokeWidth={3}
                        // @ts-ignore
                        type={file.meta?.mimeType || file.type} />}

                <Stack flex={1} minWidth={0}>
                    <Typography
                        fontSize={14}
                        fontWeight={500}
                        noWrap
                        title={file.name}>
                        {file.name}
                    </Typography>

                </Stack>
            </Paper>
        </motion.div>
    );

    const Section = ({ title, icon, files }: SectionProps) => (
        <Stack spacing={1.5} mb={8}>
            <Stack direction="row" alignItems="center" spacing={1}>
                {icon}
                <Typography fontSize={16} fontWeight={600}>
                    {title}
                </Typography>
            </Stack>
            <Stack gap={1.8} direction={"row"} flexWrap={"wrap"}>
                {files.length === 0 ? (
                    <Typography fontSize={14} color="text.secondary" ml={4}>
                        Belum ada data
                    </Typography>
                ) : (
                    files.map((file) => <FileCard key={file.id} file={file} />)
                )}
            </Stack>
        </Stack>
    );

    return (
        <Container maxWidth="lg" scrollable>

            <StickyHeader loading={loading}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" position="relative">
                    <Stack alignItems="center" spacing={1} direction="row">
                        <History size={20} />
                        <Typography fontWeight={600} fontSize={18}>
                            Riwayat
                        </Typography>
                    </Stack>
                    {/* {isLoading && (
                        <LinearProgress
                            sx={{
                                position: 'absolute',
                                bottom: -10,
                                left: 0,
                                width: '100%',
                                height: 2
                            }}
                        />
                    )} */}
                </Stack>
            </StickyHeader>

            <Stack mb={3} component={Paper} p={2} borderRadius={2} sx={{ minHeight: 'max(600px, 85vh)' }}>
                <Stack direction={"row"} spacing={1} alignItems={"center"} mb={3}>
                    <History size={20} />
                    <Typography fontSize={18} fontWeight={600}>
                        Histori
                    </Typography>
                </Stack>

                <Stack px={2}>


                    <Section title="Terakhir Dibuka" icon={<Clock size={16} />} files={[]} />
                    <Section title="Terakhir Diperbarui" icon={<History size={16} />} files={[]} />
                    <Section title="Baru Ditambahkan" icon={<Upload size={16} />} files={[]} />
                </Stack>
            </Stack>
        </Container>
    );
}
