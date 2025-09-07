'use client'

import {
    Alert,
    AlertTitle,
    Paper,
    Stack,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Box,
    useTheme,
    alpha,
    IconButton,
} from "@mui/material";
import { FolderOpenDot, FolderRoot } from "lucide-react";

import Container from "@/components/Container";
import { useCheckMyPermission } from "@/components/context/CurrentUserAbilitiesProvider";
import useRequest from "@/hooks/useRequest";
import { getDriveRoot, UserDriveSummary } from "@/actions/dive-root";
import { useEffect, useState } from "react";
import RequestError from "@/components/RequestError";
import Link from "next/link";
import { motion } from "motion/react";
import UserAvatar from "@/components/ui/UserAvatar";
import StickyHeader from "@/components/ui/navigation/StickyHeader";
import { formatFileSize } from "@/libs/utils";

export default function Page() {
    const theme = useTheme();
    const checkPermission = useCheckMyPermission();
    const isPermitted = checkPermission("can-manage-drive-root");

    const [summaries, setSummaries] = useState<UserDriveSummary[]>();

    const requestGetDriveRoot = useRequest({
        action: getDriveRoot,
        onSuccess(result) {
            setSummaries(result.data?.summaries || []);
        },
    });

    useEffect(() => {
        requestGetDriveRoot.send();
    }, []);

    return (
        <Container key={'layout'} maxWidth={"lg"} scrollable>
            {/* Sticky Header */}
            <StickyHeader>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <FolderRoot size={28} color={theme.palette.primary.main} />
                    <Typography fontSize={22} fontWeight={700}>
                        Drive Root
                    </Typography>
                </Stack>
            </StickyHeader>

            <Stack component={Paper} borderRadius={2} sx={{ minHeight: '100dvh' }}>
                {!isPermitted && (
                    <Alert severity="warning" sx={{ mb: 4, mt: 2, mx: 2 }} variant="outlined">
                        <AlertTitle>Kesalahan Wewenang</AlertTitle>
                        Kamu tidak memiliki wewenang untuk mengelola Root Drive!
                    </Alert>
                )}

                <RequestError
                    sx={{ mt: 2, mx: 2 }}
                    request={requestGetDriveRoot}
                    tryagain />


                <Stack>
                    {/* System Summary */}
                    {summaries && summaries.length > 0 && (
                        <Stack
                            direction="row"
                            flexWrap="wrap"
                            gap={2}
                            p={2}
                            sx={{
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                backgroundColor: alpha(theme.palette.primary.light, 0.05),
                                ...theme.applyStyles("dark", {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                }),
                            }}>
                            <Paper sx={{ p: 1.5, minWidth: 150, textAlign: "center", borderRadius: 2, flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Total Users</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {summaries.length}
                                </Typography>
                            </Paper>
                            <Paper sx={{ p: 1.5, minWidth: 150, textAlign: "center", borderRadius: 2, flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Total Files</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {summaries.reduce((sum, s) => sum + (s.fileCount || 0), 0)}
                                </Typography>
                            </Paper>
                            <Paper sx={{ p: 1.5, minWidth: 150, textAlign: "center", borderRadius: 2, flex: 1 }}>
                                <Typography variant="body2" color="text.secondary">Total Storage</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {formatFileSize(summaries.reduce((sum, s) => sum + Number(s.totalSize || 0), 0))}
                                </Typography>
                            </Paper>
                        </Stack>
                    )}
                </Stack>


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
                                            <IconButton LinkComponent={Link} href={`/drive-root/${s.userId}/drive`}>
                                                <FolderOpenDot size={16} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {summaries && summaries.length == 0 && !requestGetDriveRoot.pending && (
                    <Box textAlign="center" py={6} color="text.secondary">
                        Tidak ada data untuk ditampilkan.
                    </Box>
                )}
            </Stack>
        </Container>
    );
}
