'use client'

import { FileText, Download, ExternalLink, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import {
    Stack,
    Typography,
    IconButton,
    Box,
    CircularProgress,
    Alert,
    Button,
    Chip,
    Paper,
    LinearProgress
} from "@mui/material";
import usePresignUrl from "@/hooks/usePresignUrl";
import { useCallback, useEffect, useState } from "react";
import { File } from "@/entities/File";
import { ViewerModule } from "../ModuleViewerManager";
import { Task } from "@/entities/Task";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { getOne, Json } from "@/libs/websocket/query";

interface DocumentViewerProps {
    file: File<'file'>;
}

const DocumentViewerWithTask: React.FC<DocumentViewerProps> = ({ file }) => {
    const [task, setTask] = useState<Task | null>(null);

    useEffect(() => {
        // Listen for conversion tasks related to this file
        return onSnapshot(
            getOne("task")
                .where("type", "==", "convert-pdf")
                .where("status", "IN", ["pending", "processing", "completed", "failed"])
                .where(Json("payload", "fileId"), "==", file.id),
            (task) => {
                setTask(task);
            }
        );
    }, [file.id]);

    return <DocumentViewerComponent file={file} task={task} />;
};

interface DocumentViewerComponentProps extends DocumentViewerProps {
    task?: Task | null;
}


export const DocumentViewerComponent: React.FC<DocumentViewerComponentProps> = ({ file, task }) => {
    const presignedUrl = usePresignUrl(file.id, "pdfObjectKey");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsRefresh, setNeedsRefresh] = useState(false);

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setError("Failed to load document viewer");
    };

    const showConversionStatus = task && task.status !== "completed" && task.status !== "failed";
    const showCompletedOverlay = task?.status === "completed" && needsRefresh;

    if (!presignedUrl) {
        return (
            <Stack flex={1} justifyContent="center" alignItems="center" sx={{ bgcolor: "background.default" }}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Generating access URL...
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack flex={1} sx={{ bgcolor: "background.default", height: "100%", position: "relative" }}>
            {isLoading && (
                <Stack
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    justifyContent="center"
                    alignItems="center"
                    sx={{ bgcolor: "background.paper", zIndex: 1 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Loading document...
                    </Typography>
                </Stack>
            )}

            {error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {error}
                </Alert>
            )}

            <iframe
                src={presignedUrl}
                style={{ flex: 1, width: "100%", height: "100%", border: "none" }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={`document-${file.id}`}
            />
        </Stack>
    );
};



export default {
    priority: 10,
    id: 'document-viewer',
    name: "Document Viewer",
    icon: <FileText size={18} />,
    supports: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    component: DocumentViewerWithTask  // Use the wrapper component
} as ViewerModule;