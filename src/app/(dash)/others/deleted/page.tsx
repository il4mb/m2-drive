"use client";

import {
    Button,
    Paper,
    Stack,
    TableCell,
    Typography,
} from '@mui/material';
import { Folder, Trash } from 'lucide-react';
import { useEffect } from 'react';
import { useMyTrash } from '@/hooks/useMyTrash';
import Container from '@/components/Container';
import StickyHeader from '@/components/StickyHeader';
import { motion } from 'motion/react';
import { FileIcon } from '@untitledui/file-icons';
import { formatFileSize, formatLocaleDate } from '@/libs/utils';

export default function Page() {

    const files = useMyTrash();

    useEffect(() => {
        console.log(files);
    }, [files]);
    // const [files, setFiles] = useState<File[]>([]);
    // const request = useRequest({
    //     endpoint: "/api/drive",
    //     method: "GET",
    //     queryParams: { trashed: true, recursive: true },
    //     onSuccess(result) {
    //         setFiles(result.data);
    //     },
    // });

    // const refresh = () => {
    //     request.send();
    // }

    // useEffect(() => {
    //     refresh();
    // }, []);

    return (
        <Container maxWidth='lg' scrollable>
            <StickyHeader>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack alignItems="center" spacing={1} direction="row">
                        <Trash size={20} />
                        <Typography fontWeight={600} fontSize={18}>
                            Tempat Sampah
                        </Typography>
                    </Stack>
                    <Button variant="outlined" color="error">
                        Kosongkan Tempat Sampah
                    </Button>
                </Stack>
            </StickyHeader>

            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
                <motion.table>
                    {files.map((file, i) => (

                        <motion.tr
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, delay: 0.03 * i }}
                            style={{ cursor: "pointer" }}>
                            <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    {file.type === "folder" ? (
                                        <Folder strokeWidth={1} size={20} />
                                    ) : (
                                        <FileIcon variant="default" size={20} type={file.type} />
                                    )}
                                    <Typography>{file.name}</Typography>
                                </Stack>
                            </TableCell>
                            <TableCell>{formatFileSize(file.meta?.size || 0)}</TableCell>
                            <TableCell>
                                {formatLocaleDate(file.meta?.trashedAt || 0, "ID-id")}
                            </TableCell>
                        </motion.tr>
                    ))}
                </motion.table>
            </Paper>

        </Container>
    );
}
