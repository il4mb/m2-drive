"use client";

import { useRef, useEffect, useState } from "react";
import { Stack, Typography, Button, Container, Box } from "@mui/material";
import { Upload, CloudUpload, Infinity } from "lucide-react";
import { useUploads } from "@/components/context/UploadsProvider";
import UploadItem from "@/components/ui/drive/UploadItem";
import { getColor } from "@/theme/colors";
import { useDrive } from "@/components/context/DriveProvider";

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

            <Stack flex={1} overflow={"scroll"} pb={5} sx={{ pointerEvents: isDragging ? "none" : "auto" }}>

                <Container sx={{ zIndex: 1000, position: "sticky", top: 0, backdropFilter: 'blur(15px)', }}>
                    <Stack
                        py={4}
                        direction={"row"}
                        spacing={2}
                        alignItems={"center"}
                        justifyContent={"space-between"}
                        position={"sticky"}
                        top={0}
                        zIndex={1000}>

                        <Stack direction={"row"} spacing={2} alignItems={"center"}>
                            <CloudUpload size={33} />
                            <Typography fontSize={22} fontWeight={600}>
                                Unggah File
                            </Typography>
                        </Stack>

                        <Stack>
                            <Button
                                variant="contained"
                                startIcon={<Upload size={18} />}
                                onClick={() => fileInputRef.current?.click()}>
                                Pilih File
                            </Button>
                        </Stack>
                    </Stack>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => addFiles(e.target.files)}
                    />
                </Container>

                <Container component={Stack} sx={{ flex: 1 }}>

                    {(uploads.length == 0 || isDragging) && (
                        <Stack
                            flex={1}
                            direction={"row"}
                            justifyContent={"center"}
                            alignItems={"center"}
                            position={"absolute"}
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            zIndex={1000}
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
                            {uploads.length > 0 && (
                                <Box sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    backdropFilter: 'blur(5px)',
                                    zIndex: -1
                                }} />
                            )}
                        </Stack>
                    )}

                    <Stack spacing={2} mt={2}>
                        {uploads.map((u, i) => (
                            <UploadItem
                                key={u.id}
                                upload={u}
                                index={i} />
                        ))}
                    </Stack>
                </Container>
            </Stack>

        </Stack>
    );
}
