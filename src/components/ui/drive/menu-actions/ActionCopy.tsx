'use client'

import { useDrive } from "@/components/context/DriveProvider";
import { DriveFile } from "@/entity/DriveFile";
import { MenuItem, Typography } from "@mui/material";
import { Copy } from "lucide-react";

export interface ActionCopyProps {
    file: DriveFile;
    onClose?: () => void;
}
export default function ActionCopy({ file, onClose }: ActionCopyProps) {

    const { openFolderPicker } = useDrive();

    const handleClick = async () => {
        const target = await openFolderPicker("Salin Ke ...");
        if (target?.id == file.id) {
            console.log("Tidak dapat menyalin ke folder yang sama!");
            return;
        }
        console.log("Menyalin ke", target?.name);
    }

    return (
        <>
            <MenuItem onClick={handleClick}>
                <Copy size={14} />
                <Typography ml={1}>
                    Salin ke...
                </Typography>
            </MenuItem>
        </>
    );
}