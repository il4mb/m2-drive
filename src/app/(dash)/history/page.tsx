"use client";

import useRequest from "@/components/hooks/useRequest";
import { IDriveFile } from "@/entity/DriveFile";
import {
    Alert,
    AlertTitle,
    Box,
    Container,
    Stack,
    Typography,
    Paper,
} from "@mui/material";
import { History, FileText, Clock, Upload, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileIcon } from "@untitledui/file-icons";

type Response = {
    status: boolean;
    message: string;
    data: {
        lastAdded: IDriveFile[];
        lastUpdated: IDriveFile[];
        lastOpened: IDriveFile[];
    };
};

type SectionProps = {
    title: string;
    icon: React.ReactNode;
    files: IDriveFile[];
}

export default function Page() {
    const [lastAdd, setLastAdd] = useState<IDriveFile[]>([]);
    const [lastUpdate, setLastUpdate] = useState<IDriveFile[]>([]);
    const [lastOpen, setLastOpen] = useState<IDriveFile[]>([]);

    const fetchHistory = useRequest<Response>({
        endpoint: "/api/drive/history",
        onSuccess(result) {
            setLastAdd(result.data.lastAdded);
            setLastUpdate(result.data.lastUpdated);
            setLastOpen(result.data.lastOpened);
        },
    });

    useEffect(() => {
        fetchHistory.send();
    }, []);

    const FileCard = ({ file }: { file: IDriveFile }) => (
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
                {file.type == "folder" ? <Folder size={28} strokeWidth={1}/> : <FileIcon variant="solid" size={28} strokeWidth={3} type={file.meta?.mimeType || file.type} />}

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
        <Stack flex={1} py={4} overflow={"hidden"}>
            <Container>
                <Stack mb={3}>
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <History size={20} />
                        <Typography fontSize={18} fontWeight={600}>
                            Histori
                        </Typography>
                    </Stack>
                </Stack>
            </Container>

            <Container sx={{ p: 2, overflow: 'auto' }}>
                {fetchHistory.error && (
                    <Alert
                        severity="error"
                        onClose={fetchHistory.clearError}
                        sx={{ mb: 2 }}>
                        <AlertTitle>{fetchHistory.error.type}</AlertTitle>
                        {fetchHistory.error.message}
                    </Alert>
                )}

                <Section title="Terakhir Dibuka" icon={<Clock size={16} />} files={lastOpen} />
                <Section title="Terakhir Diperbarui" icon={<History size={16} />} files={lastUpdate} />
                <Section title="Baru Ditambahkan" icon={<Upload size={16} />} files={lastAdd} />

            </Container>
        </Stack>
    );
}
