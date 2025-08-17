"use client"

import usePresignUrl from '@/components/hooks/usePresignUrl';
import { IDriveFile } from '@/entity/DriveFile';
import { Avatar, Stack, Typography } from '@mui/material';
import { FileImage, Folder } from 'lucide-react';
import ContextMenu from '../ContextMenu';
import { FileIcon } from '@untitledui/file-icons';


export interface FileItemProps {
    file: IDriveFile;
    layout?: "list" | "grid";
    index?: number;
}
export default function FileItem({ file, layout = "grid" }: FileItemProps) {

    const mimeType = file.meta?.mimeType;
    const isImage = mimeType?.startsWith("image");
    const isFolder = file.type == "folder";

    return (
        <ContextMenu>
            <Stack
                padding={4}
                direction={layout == "grid" ? "column" : "row"}
                sx={{
                    maxWidth: layout == "grid" ? 180 : "none",
                    width: '100%'
                }}
                spacing={1}
                alignItems={"center"}
                p={1}>
                <Stack>
                    {isImage
                        ? <FileMedia file={file} />
                        : isFolder
                            ? <Folder size={24} />
                            : <FileIcon size={24} type={mimeType || file.type} />}
                </Stack>
                <Typography>{file.name}</Typography>
            </Stack>
        </ContextMenu>
    );
}

const FileMedia = ({ file }: { file: any }) => {
    const presignUrl = usePresignUrl(file);
    return (
        <Avatar src={presignUrl} variant='square' sx={{ width: 24, height: 24, borderRadius: 0.5 }}>
            <FileImage />
        </Avatar>
    )
}