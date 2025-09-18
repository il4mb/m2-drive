"use client";

import { File } from "@/entities/File";
import {
    Stack,
    Typography,
    Paper,
    Chip,
    Button,
    Box,
    Divider,
    IconButton,
    Skeleton
} from "@mui/material";
import { History, MoreVertical, Eye, Edit, Download, Share, FolderOpen, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { FileIcon } from "@untitledui/file-icons";
import Container from "@/components/Container";
import StickyHeader from "@/components/navigation/StickyHeader";
import { useEffect, useMemo, useState } from "react";
import { Activity } from "@/entities/Activity";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { getMany, Json } from "@/libs/websocket/query";
import { useCurrentSession } from "@/components/context/CurrentSessionProvider";
import { formatDateFromEpoch } from "@/libs/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import Link from "next/link";
import FileViewIcon from "@/components/drive/FileViewIcon";

type SectionProps = {
    title: string;
    icon: React.ReactNode;
    data: Rows;
    activityType: "view" | "edit";
    loading: boolean;
}

type FileActivity = Activity & {
    file: File | null;
    users?: Array<{ id: string; name: string; avatar?: string }>;
}

type Rows = {
    rows: FileActivity[];
    total: number;
}

export default function Page() {
    const session = useCurrentSession();
    const userId = useMemo(() => session.userId, [session.userId]);
    const [openLoading, setOpenLoading] = useState(true);
    const [editLoading, setEditLoading] = useState(true);
    const [open, setOpen] = useState<Rows>({ rows: [], total: 0 });
    const [edit, setEdit] = useState<Rows>({ rows: [], total: 0 });

    useEffect(() => {
        setOpenLoading(true);
        return onSnapshot(
            getMany("activity")
                .where("type", "IN", ["VIEW_FILE", "VIEW_FOLDER"])
                .where(Json("metadata", "fileId"), "IS NOT NULL")
                .where("userId", "==", userId)
                .join("file", "file.id = metadata->>'fileId'")
                .orderBy("createdAt", "DESC")
                .groupBy("$file.id")
                .limit(5),
            (data) => {
                setOpenLoading(false);
                setOpen(data as any);
                setOpenLoading(false);
            }
        );
    }, [userId]);

    useEffect(() => {
        setEditLoading(true);
        return onSnapshot(
            getMany("activity")
                .where("type", "IN", ["EDIT_FILE", "EDIT_FOLDER", "CREATE_FOLDER", "MOVE_FILE", "MOVE_FOLDER", "COPY_FILE", "COPY_FOLDER"])
                .where(Json("metadata", "fileId"), "IS NOT NULL")
                .where("userId", "==", userId)
                .join("file", "file.id = metadata->>'fileId'")
                .orderBy("createdAt", "DESC")
                .groupBy("$file.id")
                .limit(5),
            (data) => {
                setEditLoading(false);
                setEdit(data as any);
                setEditLoading(false);
            }
        );
    }, [userId]);

    const ActivityItem = ({ activity, type, index }: { activity: FileActivity, type: "view" | "edit", index: number }) => {
        const file = activity.file;
        const isMine = activity.file?.uId == session.userId;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 * index }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        mb: 1,
                        "&:hover": {
                            backgroundColor: "action.hover",
                        },
                    }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: type === "view" ? "primary.50" : "secondary.50",
                                color: type === "view" ? "primary.main" : "secondary.main",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                position: 'relative'
                            }}>
                            {file && (
                                <FileViewIcon file={file!} size={20} />
                            )}

                            {userId !== file?.uId && (
                                <Box sx={{
                                    position: 'absolute',
                                    bottom: -4,
                                    right: -4,
                                    border: '2px solid white',
                                    borderRadius: '50%'
                                }}>
                                    <UserAvatar
                                        size={16}
                                        userId={file?.uId}
                                    />
                                </Box>
                            )}
                        </Box>

                        <Stack flex={1}>
                            <Typography variant="body2" color="text.secondary">
                                {activity.description?.substring(0, 40)} • {formatDateFromEpoch(activity.createdAt)}
                            </Typography>
                            <Typography fontWeight={500} noWrap>
                                {activity.file?.name}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1}>
                            {isMine && (
                                <IconButton size="small" LinkComponent={Link} href={"/drive/" + activity.file?.id}>
                                    <ExternalLink size={16} />
                                </IconButton>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            </motion.div>
        );
    };

    const ActivityItemSkeleton = () => (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                mb: 1,
            }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="rounded" width={44} height={44} />
                <Stack flex={1} spacing={1}>
                    <Skeleton variant="text" width="40%" height={16} />
                    <Skeleton variant="text" width="60%" height={20} />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                </Stack>
            </Stack>
        </Paper>
    );

    const Section = ({ title, icon, data, activityType, loading }: SectionProps) => (
        <Stack spacing={2} mb={4}>
            <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                    {icon}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontSize={16} fontWeight={600}>
                            {title}
                        </Typography>
                        {!loading && <Chip label={data.total} size="small" />}
                        {loading && <Skeleton variant="rounded" width={32} height={24} />}
                    </Stack>
                </Stack>
                {/* {!loading && data.rows.length > 0 && (
                    <Button size="small" variant="text">
                        Lihat Semua
                    </Button>
                )} */}
                {loading && <Skeleton variant="rounded" width={100} height={32} />}
            </Stack>

            {loading ? (
                <Box>
                    {[1, 2, 3].map((i) => (
                        <ActivityItemSkeleton key={i} />
                    ))}
                </Box>
            ) : data.rows.length === 0 ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        borderRadius: 2,
                        border: "1px dashed",
                        borderColor: "divider",
                        textAlign: "center",
                    }}>
                    <Stack alignItems="center" spacing={1}>
                        <History size={32} color="#ddd" />
                        <Typography color="text.secondary">
                            Belum ada aktivitas {activityType === "view" ? "dilihat" : "diedit"}
                        </Typography>
                    </Stack>
                </Paper>
            ) : (
                <Box>
                    {data.rows.map((activity, index) => (
                        <ActivityItem
                            index={index}
                            key={activity.id}
                            activity={activity}
                            type={activityType}
                        />
                    ))}
                </Box>
            )}
        </Stack>
    );

    return (
        <Container maxWidth={"lg"} scrollable>
            <StickyHeader loading={openLoading || editLoading}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <History size={20} />
                    <Typography fontWeight={600} fontSize={18}>
                        Riwayat
                    </Typography>
                </Stack>
            </StickyHeader>

            <Stack spacing={3} sx={{ minHeight: 'max(600px, 85vh)', pb: 4 }}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                    <Stack spacing={1} mb={3}>
                        <Typography variant="h5" fontWeight={600}>
                            Aktivitas Terbaru
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Melacak file dan folder yang baru saja Anda akses atau edit
                        </Typography>
                    </Stack>

                    <Divider sx={{ mb: 3 }} />

                    <Section
                        title="Baru Saja Dibuka"
                        icon={<Eye size={16} />}
                        data={open}
                        activityType="view"
                        loading={openLoading}
                    />

                    <Section
                        title="Baru Saja Diedit"
                        icon={<Edit size={16} />}
                        data={edit}
                        activityType="edit"
                        loading={editLoading}
                    />
                </Paper>
            </Stack>
        </Container>
    );
}