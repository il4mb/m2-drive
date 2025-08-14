import { IFile, isFolder } from '@/types';
import { List, Stack } from '@mui/material';
import DriveFolder from './DriveFolder';
import DriveFile from './DriveFile';

export interface DriveContainerProps {

}


const FILES: IFile[] = [
    {
        type: "folder",
        name: "Dokumen",
        files: []
    },
    {
        type: "folder",
        name: "Gambar",
        files: []
    },
    {
        type: "folder",
        name: "Video",
        files: [
            {
                type: "video/mp4",
                name: "PMB 2025",
                extension: "mp4",
                size: 2500
            }
        ]
    },
    {
        type: "text/raw",
        name: "Hallo World",
        extension: "txt",
        size: 10
    },
    {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        name: "Data",
        extension: "csv",
        size: 10
    },
    {
        type: "application/pdf",
        name: "Permohonan Proposal",
        extension: "csv",
        size: 10
    },
]



export default function DriveRoot({ }: DriveContainerProps) {
    return (
        <Stack>
            <List>
                {FILES.map((file, i) => (
                    isFolder(file)
                        ? <DriveFolder key={i} file={file} />
                        : <DriveFile key={i} file={file} />
                ))}
            </List>
        </Stack>
    );
}