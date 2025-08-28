"use client";

import { useState, useRef, useEffect, ChangeEvent, ReactNode } from "react";
import { Avatar, Box, IconButton, Stack, SxProps, Tooltip, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useSnackbar } from "notistack";
import { getColor } from "@/theme/colors";
import useImageResize from "../hooks/useImageResize";
import { Upload, User, X } from "lucide-react";

interface AvatarPickerProps {
    value?: File | null; // Controlled mode
    defaultValue?: File | null; // Uncontrolled mode
    onChange?: (file: File | null) => void;
    disabled?: boolean;
    src?: string;
    size?: { width: number; height: number };
    label?: ReactNode;
    placeholderAvatar?: ReactNode;
    sx?: SxProps;
    children?: ReactNode;
}

export default function AvatarPicker({
    value,
    defaultValue = null,
    onChange,
    src,
    label = "Avatar",
    disabled = false,
    size = { width: 200, height: 200 },
    children = <User />,
    sx
}: AvatarPickerProps) {
    const resizer = useImageResize(size.width, size.height);
    const { enqueueSnackbar } = useSnackbar();
    const inputRef = useRef<HTMLInputElement>(null);
    const [hovered, setHovered] = useState(false);

    // Only used in uncontrolled mode
    const [internalFile, setInternalFile] = useState<File | null>(defaultValue);
    const [source, setSource] = useState<string | undefined>(src);

    const file = value !== undefined ? value : internalFile; // unify value

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        if (!f.type.startsWith("image/")) {
            enqueueSnackbar("File harus berjenis gambar!", { variant: "warning" });
            return;
        }

        // Always resize before storing/sending
        const resizedFile = await resizer(f);
        if (!resizedFile) {
            enqueueSnackbar("Gagal memproses gambar.", { variant: "error" });
            return;
        }

        if (value !== undefined) {
            // Controlled mode
            onChange?.(resizedFile);
        } else {
            // Uncontrolled mode
            setInternalFile(resizedFile);
        }

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };


    const handleClear = () => {
        if (value !== undefined) {
            onChange?.(null);
        } else {
            setInternalFile(null);
        }
        if (inputRef.current) inputRef.current.value = "";
    };

    // Update preview when file changes (original file only)
    useEffect(() => {
        if (!(file instanceof File)) {
            setSource(undefined);
            return;
        }

        const objURL = URL.createObjectURL(file);
        setSource(objURL);

        return () => URL.revokeObjectURL(objURL);
    }, [file]);


    // Resize only before sending to controller
    useEffect(() => {
        if (!internalFile) return;

        (async () => {
            const resizedFile = await resizer(internalFile);
            if (resizedFile) {
                onChange?.(resizedFile); // Send resized image to controller
            }
        })();
    }, [internalFile]);

    return (
        <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            pb={2}
            px={1}
            onMouseEnter={() => !disabled && setHovered(true)}
            onMouseLeave={() => !disabled && setHovered(false)}
            sx={sx}>
            <motion.div
                animate={{
                    scale: hovered ? 1.05 : 1,
                    boxShadow: hovered
                        ? "0px 4px 20px rgba(0,0,0,0.15)"
                        : "0px 0px 0px rgba(0,0,0,0)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{ borderRadius: 8 }}>
                <Box sx={{ position: "relative", display: "inline-block" }}>
                    <Avatar
                        variant="rounded"
                        src={source || src}
                        sx={{ width: 50, height: 50, cursor: "pointer" }}>
                        {children}
                    </Avatar>
                    {file && !disabled && (
                        <Tooltip title="Hapus avatar" arrow>
                            <IconButton
                                onClick={handleClear}
                                size="small"
                                sx={{ position: "absolute", top: -15, left: -15 }}>
                                <X />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </motion.div>

            <Stack
                flex={1}
                sx={{ cursor: "pointer" }}
                onClick={() => inputRef.current?.click()}>
                <AnimatePresence mode="wait">
                    {!hovered ? (
                        <motion.div
                            key="avatar-info"
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.25 }}>
                            <Typography variant="body2">{label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Upload avatar, width {size.width}x{size.height}
                            </Typography>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="avatar-hover"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                color: getColor("primary")[300],
                            }}
                        >
                            <Upload size={22} />
                            <Typography fontWeight={600} fontSize={14}>
                                Pick Picture
                            </Typography>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Stack>

            <input
                disabled={disabled}
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
            />
        </Stack>
    );
}
