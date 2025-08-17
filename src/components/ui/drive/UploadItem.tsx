"use client"

import { LinearProgress, Stack, Typography, Tooltip, Button } from "@mui/material";
import { motion } from "framer-motion";
import { getColor } from "@/theme/colors";
import { useEffect, useMemo, useState } from "react";
import { DriveUpload } from "@/types";
import { formatFileSize } from "@/libs/utils";
import { Pause, Trash, RefreshCcw, Play } from "lucide-react";
import { FileIcon } from "@untitledui/file-icons";
import { useUploadManager } from "@/components/context/UploadManager";

type ActionName = "onPause" | "onResume" | "onRemove" | "onRetry";
type PendingState = {
    [key in ActionName]?: boolean;
}
type ActionState = {
    [key in ActionName]?: () => Promise<void>;
}
export interface Props extends ActionState {
    upload: DriveUpload;
    index: number;
}

export default function UploadItem({ upload, index }: Props) {

    const { removeUpload, resumeUpload, pauseUpload } = useUploadManager();

    const [pending, setPending] = useState<PendingState>({});
    const { status } = upload;
    const progress = Math.floor((upload.chunkIndex / (upload.totalChunks ?? 1)) * 100);

    useEffect(() => {
        console.log(upload.status)
    }, [upload])

    const color = useMemo(() => getColor(
        upload.status == "pending" ? "secondary"
            : upload.status == "uploading" ? "primary"
                : upload.status == "error"  ? "error"
                    : upload.status == "done" ? "success" : "secondary"
    ), [upload.status]);


    // Utility to handle loading state wrapper
    const withPending = (key: ActionName, action?: () => Promise<void>) => async () => {
        console.log(key);

        if (!action || pending[key]) return;
        setPending(prev => ({ ...prev, [key]: true }));
        try {
            await action();
        } finally {
            setPending(prev => ({ ...prev, [key]: false }));
        }
    }

    return (
        <Stack
            component={motion.div}
            initial={{ y: 10, x: 10, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            sx={(theme) => ({
                // overflow: 'hidden',
                borderRadius: 2,
                background: color[100],
                border: "1px solid",
                borderColor: color[300],
                p: 2,
                boxShadow: 1,
                "&:hover": {
                    borderColor: color[600],
                },
                ...theme.applyStyles("dark", {
                    background: color[900],
                    borderColor: color[600],
                    "&:hover": {
                        borderColor: color[400],
                    },
                })
            })}>
            <Stack
                direction="row"
                alignItems="center"
                overflow={"hidden"}
                spacing={1}>

                <FileIcon variant="solid" type={upload.fileType} />
                <Stack flex={1}>
                    <Typography fontSize={14} fontWeight={600}>{upload.fileName}</Typography>
                    <Typography color="text.secondary">{formatFileSize(upload.fileSize)}</Typography>
                    <Stack direction={"row"} alignItems={'center'} spacing={2} position={"relative"}>
                        <Typography>{status == "done" ? 100 : progress}%</Typography>
                        <LinearProgress
                            color={
                                status == "error"
                                    ? "error"
                                    : status == "done"
                                        ? "success"
                                        : status == "uploading"
                                            ? "primary"
                                            : "secondary"
                            }
                            variant={status == "finishing" ? "indeterminate" : "determinate"}
                            sx={{ mt: 1, height: 3, flex: 1 }}
                            value={status == "done" ? 100 : progress} />

                        {/* ACTIONS */}
                        <Stack direction={"row"} spacing={2} sx={{ position: 'absolute', right: 0, bottom: '100%' }}>
                            {status == "finishing" && (
                                <Typography color="primary">
                                    Menyelesaikan...
                                </Typography>
                            )}
                            {status == "uploading" && (
                                <Tooltip title="Jeda unggahan">
                                    <Button
                                        size="small"
                                        startIcon={<Pause size={14} />}
                                        loading={pending.onPause}
                                        onClick={withPending("onPause", () => pauseUpload(upload.id))}>
                                        Jeda
                                    </Button>
                                </Tooltip>
                            )}
                            {status == "pause" && (
                                <Tooltip title="Mulai unggahan">
                                    <Button
                                        size="small"
                                        startIcon={<Play size={14} />}
                                        loading={pending.onResume}
                                        onClick={withPending("onResume", () => resumeUpload(upload.id))}>
                                        Mulai
                                    </Button>
                                </Tooltip>
                            )}
                            {status == "error" && (
                                <>
                                    <Tooltip title="Hapus unggahan" arrow>
                                        <Button
                                            size="small"
                                            startIcon={<Trash size={14} />}
                                            loading={pending.onRemove}
                                            onClick={withPending("onRemove", () => removeUpload(upload.id))}>
                                            Hapus
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Coba lagi" arrow>
                                        <Button
                                            size="small"
                                            loading={pending.onRetry}
                                            startIcon={<RefreshCcw size={14} />}
                                            onClick={withPending("onRetry", () => resumeUpload(upload.id))}>
                                            Coba Lagi
                                        </Button>
                                    </Tooltip>
                                </>
                            )}
                            {status == "done" && (
                                <Tooltip title="Hapus unggahan" arrow>
                                    <Button
                                        size="small"
                                        startIcon={<Trash size={14} />}
                                        loading={pending.onRemove}
                                        onClick={withPending("onRemove", () => removeUpload(upload.id))}>
                                        Hapus
                                    </Button>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        </Stack >
    );
}
