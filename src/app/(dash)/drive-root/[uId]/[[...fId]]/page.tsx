'use client'

import FileView from '@/components/drive/FileView';
import useLocalStorage from '@/hooks/useLocalstorage';
import useUser from '@/hooks/useUser';
import useUserDrive from '@/hooks/useUserDrive';
import { File } from '@/entity/File';
import { IconButton, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { ChevronLeft, FolderOpen, Funnel, Grid, HardDrive, LayoutGrid, List, StretchHorizontal } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from "motion/react";

export interface pageProps {
    children?: ReactNode;
}
export default function page() {

    const router = useRouter();
    const { uId, fId = [] } = useParams<{ uId: string; fId: string[] }>();
    const { user } = useUser(uId);
    const lastFid = fId[fId.length - 1];
    const { files, parent, loading } = useUserDrive(uId, lastFid);

    const [selected, setSelected] = useState<File>();
    const [layout, setLayout] = useLocalStorage<"grid" | "list">("drive-layout", 'grid');

    const handleOpen = (file: File) => {
        router.push(`/drive-root/${uId}/${[...fId, file.id].join("/")}`);
    }

    const toggleLayout = () => setLayout(prev => prev == "grid" ? "list" : "grid");

    return (
        <Stack>
            <Stack mb={2} direction={"row"} alignItems={"center"}>
                <Stack flex={1}>
                    {loading ? (
                        <Stack direction={"row"} spacing={1} alignItems={"flex-end"}>
                            <Skeleton variant='rounded' width={30} height={30} />
                            <Skeleton width={120} />
                        </Stack>
                    ) : parent ? (
                        <Stack direction={"row"} spacing={2} alignItems={"center"}>
                            <IconButton onClick={() => router.back()}>
                                <ChevronLeft size={16} />
                            </IconButton>
                            <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                <FolderOpen />
                                <Typography>
                                    {parent.name}
                                </Typography>
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack direction={"row"} spacing={2} alignItems={"center"}>
                            <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                <HardDrive />
                                <Typography>
                                    {user?.name || "Unknown"}{" "} Drive
                                </Typography>
                            </Stack>
                        </Stack>
                    )}
                </Stack>
                <Stack direction={"row"} spacing={1} flexBasis={400} alignItems={"center"}>
                    <TextField size='small' label={`Cari di ${parent ? parent.name : 'Drive'}`} fullWidth />
                    <IconButton>
                        <Funnel size={16} />
                    </IconButton>
                    <IconButton onClick={toggleLayout}>
                        {layout == "grid" ? <LayoutGrid size={16} /> : <StretchHorizontal size={16} />}
                    </IconButton>
                </Stack>
            </Stack>

            <Stack
                direction={layout == "grid" ? "row" : "column"}
                gap={layout == "grid" ? 3 : 0}
                flexWrap={"wrap"}>
                <AnimatePresence>
                    {files?.map((file, i) => (
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{
                                delay: 0.02 * i
                            }}
                            style={{
                                maxWidth: layout == "grid" ? '200px' : '100%',
                                width: '100%'
                            }}
                            key={layout + file.id}>
                            <FileView
                                size={22}
                                onOpen={handleOpen}
                                onSelect={setSelected}
                                selected={file.id == selected?.id}
                                layout={layout}
                                file={file} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </Stack>
        </Stack>
    );
}