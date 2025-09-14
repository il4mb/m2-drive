'use client'

import {
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
    Alert,
} from "@mui/material";
import { FolderOpenDot } from "lucide-react";

import { useEffect, useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";
import { formatFileSize } from "@/libs/utils";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { UserDriveSummary } from "@/server/functions/summary";
import { useMyPermission } from "@/hooks/useMyPermission";


export interface UsersDriveProps {

}
export default function UsersDrive({ }: UsersDriveProps) {

    const theme = useTheme();
    const [mounted, setMounted] = useState(false);
    const canManageDrive = useMyPermission('can-manage-drive-root');
    const [error, setError] = useState<string | null>(null);
    const [summaries, setSummaries] = useState<Omit<UserDriveSummary, "mimeBreakdown">[]>([]);

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        if (!mounted) return;
        invokeFunction("getDriveSummaryAllUser")
            .then(result => {
                if (!result.success) setError(result.error || null);
                setSummaries(result.data || []);
            })
    }, [mounted]);


    return (
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
    );
}