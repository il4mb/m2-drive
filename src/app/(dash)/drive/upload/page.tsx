"use client";

import { useRef, useEffect, useState } from "react";
import { Stack, Typography, Button, Paper } from "@mui/material";
import { Upload, CloudUpload, Infinity } from "lucide-react";
import { useUploads } from "@/components/context/UploadsProvider";
import { getColor } from "@/theme/colors";
import { useDrive } from "@/components/context/DriveProvider";
import StickyHeader from "@/components/navigation/StickyHeader";
import Container from "@/components/Container";
import UploadManager from "@/components/ui/upload/UploadManager";

export default function UploadPage() {


    const { openFolderPicker } = useDrive();
    const { uploads, addUpload, hideBadge } = useUploads();

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = async (files: FileList | null) => {
        if (!files) return;
        try {
            const folder = await openFolderPicker("Pilih Folder Tujuan Unggah");
            Array.from(files).forEach((file) => {
                addUpload(file, folder?.id || null);
            })
        } catch (e) {
            console.warn(e);
        }
    };


    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };


    useEffect(() => {
        hideBadge();
    }, []);

    return (
        <Stack
            flex={1}
            overflow={"hidden"}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            position={"relative"}>
            <Container maxWidth={"lg"} scrollable>
                <StickyHeader actions={
                    <Stack>
                        <Button
                            variant="contained"
                            startIcon={<Upload size={18} />}
                            onClick={() => fileInputRef.current?.click()}>
                            Pilih File
                        </Button>
                    </Stack>
                }>
                    <Stack
                        direction={"row"}
                        spacing={2}
                        alignItems={"center"}
                        justifyContent={"space-between"}
                        position={"sticky"}>

                        <Stack direction={"row"} spacing={2} alignItems={"center"}>
                            <CloudUpload size={33} />
                            <Typography fontSize={22} fontWeight={600}>
                                Unggah File
                            </Typography>
                        </Stack>


                    </Stack>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => addFiles(e.target.files)}
                    />
                </StickyHeader>

                <Paper sx={{ borderRadius: 2, background: 'transparent' }}>
                    <Stack minHeight={'max(600px, 85vh)'} p={[2, 3, 4]}>
                        {(uploads.length == 0 || isDragging) && (
                            <Stack
                                flex={1}
                                direction={"row"}
                                justifyContent={"center"}
                                alignItems={"center"}
                                sx={{ pointerEvents: 'none' }}>
                                <Stack
                                    flexBasis={600}
                                    p={5}
                                    border={"3px dashed"}
                                    borderColor={isDragging ? getColor("primary")[400] : getColor("secondary")[400]}
                                    color={isDragging ? getColor("primary")[400] : "text.primary"}
                                    borderRadius={4}
                                    justifyContent={"center"}
                                    alignItems={"center"}>
                                    <Upload size={32} />
                                    <Typography fontSize={18} fontWeight={600} mt={2}>
                                        Drag & Drop
                                    </Typography>
                                    <Typography mt={1}>Kamu bisa upload banyak file dalam satu waktu.</Typography>
                                    <Typography mt={1.4}>Max Ukuran File:</Typography>
                                    <Infinity />
                                </Stack>
                            </Stack>
                        )}
                        {uploads.length > 0 && (
                            <UploadManager uploads={uploads} />
                        )}
                    </Stack>
                </Paper>

            </Container>
        </Stack>
    );
}
