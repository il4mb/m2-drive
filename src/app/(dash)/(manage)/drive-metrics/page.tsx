'use client'

import {
    Paper,
    Stack,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    useTheme,
    alpha,
    IconButton,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
} from "@mui/material";
import { ChartArea, FolderOpenDot, FolderRoot, User2, Users2 } from "lucide-react";

import Container from "@/components/Container";
import { useEffect, useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";
import StickyHeader from "@/components/navigation/StickyHeader";
import { formatDateFromEpoch, formatFileSize } from "@/libs/utils";
import PermissionSuspense from "@/components/PermissionSuspense";
import StorageSummary from "@/components/analistic/StorageSummary";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { UserDriveSummary } from "@/server/functions/summary";
import { useMyPermission } from "@/hooks/useMyPermission";
import { Task } from "@/entities/Task";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { getOne } from "@/libs/websocket/query";
import { motion } from "motion/react";


const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.5
        }
    }
};

export default function Page() {

    const theme = useTheme();
    const canManageDrive = useMyPermission('can-manage-drive-root');
    const [error, setError] = useState<string | null>(null);
    const [summaries, setSummaries] = useState<Omit<UserDriveSummary, "mimeBreakdown">[]>([]);
    const [mounted, setMounted] = useState(false);
    const [value, setValue] = useState(1);
    const [task, setTask] = useState<Task | null>();
    const isTaskActive = Boolean(task && (task.status === 'pending' || task.status === 'processing'));

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        if (!mounted) return;
        invokeFunction("getDriveSummaryAllUser")
            .then(result => {
                if (!result.success) setError(result.error || null);
                setSummaries(result.data || []);
            })
    }, [mounted]);


    useEffect(() => {
        if (!mounted) return;
        return onSnapshot(
            getOne("task")
                .where("type", "==", "scan-storage")
                .orderBy("createdAt", "DESC"),
            setTask
        )
    }, [mounted]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <PermissionSuspense permission={"can-see-drive-root"}>
            <Container key={'layout'} maxWidth={"xl"} scrollable>
                {/* Sticky Header */}
                <StickyHeader canGoBack>
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <FolderRoot size={28} color={theme.palette.primary.main} />
                        <Typography fontSize={22} fontWeight={700}>
                            Drive Metrics
                        </Typography>
                    </Stack>
                </StickyHeader>

                <Stack component={Paper} borderRadius={2} sx={{ minHeight: '100dvh', p: 2 }}>

                    <Box>
                        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                            <Tab label={<ChartArea size={20} />} value={1} sx={{ px: 2 }} />
                            <Tab label={<Users2 size={20} />} value={2} sx={{ px: 2 }} />
                        </Tabs>
                    </Box>

                    <Box sx={{ mt: 1 }}>
                        {value == 1 ? (
                            <>
                                {isTaskActive && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        variants={itemVariants}>
                                        <Paper sx={{ p: 3, borderRadius: 2, mb: 3, boxShadow: 2, bgcolor: 'info.light' }}>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <CircularProgress size={24} />
                                                <Box>
                                                    <Typography variant="h6" fontWeight={600}>
                                                        Scanning in Progress
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {task?.status === 'processing'
                                                            ? 'Currently scanning drive storage...'
                                                            : 'Task is queued and will start soon'}
                                                    </Typography>
                                                    {task?.createdAt && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Started: {formatDateFromEpoch(task.createdAt)}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </motion.div>
                                )}
                                <StorageSummary />
                            </>
                        ) : (
                            <Stack>

                                {error && (
                                    <Alert variant="outlined" severity="error" sx={{ mb: 2 }}>
                                        {error}
                                    </Alert>
                                )}

                                {summaries && (
                                    <TableContainer>
                                        <Table
                                            size="small"
                                            sx={(theme) => ({
                                                "& thead th": {
                                                    backgroundColor: theme.palette.grey[100],
                                                    fontWeight: 700,
                                                    fontSize: "0.875rem",
                                                },
                                                "& tbody tr:hover": {
                                                    backgroundColor: theme.palette.action.hover,
                                                    transition: "background-color 0.2s ease-in-out",
                                                },
                                                ...theme.applyStyles("dark", {
                                                    "& thead th": {
                                                        backgroundColor: alpha(theme.palette.grey[100], 0.1)
                                                    },
                                                })
                                            })}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>User</TableCell>
                                                    <TableCell>Email</TableCell>
                                                    <TableCell align="right">Files</TableCell>
                                                    <TableCell align="right">Folders</TableCell>
                                                    <TableCell align="right">Total Size</TableCell>
                                                    <TableCell align="right"></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summaries.map((s, i) => (
                                                    <TableRow key={i} hover>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <UserAvatar size={35} userId={s.userId} />
                                                                <Typography fontWeight={500}>{s.userName || "Unknown"}</Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell sx={{ color: theme.palette.text.secondary }}>
                                                            {s.userEmail || "-"}
                                                        </TableCell>
                                                        <TableCell align="right">{s.fileCount}</TableCell>
                                                        <TableCell align="right">{s.folderCount}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                            {formatFileSize(Number(s.totalSize))}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {canManageDrive && (
                                                                <IconButton LinkComponent={Link} href={`/drive-metrics/${s.userId}/drive`}>
                                                                    <FolderOpenDot size={16} />
                                                                </IconButton>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                {summaries && summaries.length == 0 && (
                                    <Box textAlign="center" py={6} color="text.secondary">
                                        Tidak ada data untuk ditampilkan.
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </Container>
        </PermissionSuspense>
    );
}
