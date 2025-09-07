'use client'

import { FileText, ZoomIn, ZoomOut, Download, Printer, RotateCw, Search, ChevronLeft, ChevronRight, BookOpen, FileIcon } from "lucide-react"
import { ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    Stack,
    IconButton,
    Typography,
    Box,
    Paper,
    Slider,
    TextField,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,
    Tooltip,
    CircularProgress
} from "@mui/material";
import { motion, AnimatePresence } from "motion/react"
import usePresignUrl from "@/hooks/usePresignUrl";

interface DocumentViewerProps {
    file: File<'file'>;
}

export const DocumentViewerComponent: React.FC<DocumentViewerProps> = ({ file }) => {
    
    return (
        <Typography>Belum Siap!</Typography>
    )
};

export default {
    priority: 5,
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
    component: DocumentViewerComponent
} as ViewerModule;