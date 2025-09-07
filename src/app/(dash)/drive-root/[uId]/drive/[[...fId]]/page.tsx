'use client'

import FileView from '@/components/drive/FileView';
import useUser from '@/hooks/useUser';
import useUserDrive, { Filter } from '@/hooks/useDrive';
import { File } from '@/entity/File';
import { IconButton, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Calendar, CaseSensitive, ChevronLeft, Clock, FolderOpen, Funnel, HardDrive, LayoutGrid, StretchHorizontal } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from "motion/react";
import AnchorMenu from '@/components/context-menu/AnchorMenu';
import { useContextMenu } from '@/components/context-menu/ContextMenu';
import { DriveLayoutState } from '../layout';
import ActionDivider from '@/components/menu-actions/ActionDivider';
import ActionLabel from '@/components/menu-actions/ActionLabel';

export interface pageProps {
    children?: ReactNode;
}
export default function page() {

    const { layout, sort: sortBy, order, setLayout, setFolder, setOrder, setSort } = useContextMenu<DriveLayoutState>();
    const router = useRouter();
    const { uId, fId = [] } = useParams<{ uId: string; fId: string[] }>();
    const { user } = useUser(uId);
    const lastFid = fId[fId.length - 1];

    const [keyword, setKeyword] = useState('');
    const filter = useMemo<Filter>(() => ({ sortBy, order }), [sortBy, order]);
    const { files, parent, loading } = useUserDrive({
        uId,
        keyword,
        pId: lastFid || null,
        filter
    });

    const [selected, setSelected] = useState<File>();

    const handleOpen = (file: File) => {
        router.push(`/drive-root/${uId}/drive/${[...fId, file.id].join("/")}`);
    }
    const toggleLayout = () => setLayout(layout == "grid" ? "list" : "grid");

    const menuItem = useMemo(() => ([
        {
            icon: CaseSensitive,
            label: "Sort By Name",
            action: () => setSort("name"),
            active: sortBy === "name"
        },
        {
            icon: Calendar,
            label: "Sort By Create Date",
            action: () => setSort("createdAt"),
            active: sortBy === "createdAt"
        },
        {
            icon: Clock,
            label: "Sort By Update Date",
            action: () => setSort("updatedAt"),
            active: sortBy === "updatedAt"
        },
        { type: 'divider' } as const,
        {
            icon: ArrowDownWideNarrow,
            label: "Order DESC",
            action: () => setOrder("DESC"),
            active: order === "DESC"
        },
        {
            icon: ArrowUpNarrowWide,
            label: "Order ASC",
            action: () => setOrder("ASC"),
            active: order === "ASC"
        }
    ]), [order, sortBy])


    const additionalMenu = useMemo(() => [
        ActionDivider,
        ActionLabel,
    ], []);

    useEffect(() => {
        setFolder(parent || null);
    }, [parent]);


    return (
        <Stack flex={1}>
            <Stack mb={3} direction={"row"} alignItems={"center"} position={'relative'}>
                <Stack flex={1}>
                    {parent ? (
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
                    <TextField
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        size='small'
                        label={`Cari di ${parent ? parent.name : 'Drive'}`}
                        fullWidth />
                    <AnchorMenu items={menuItem}>
                        <IconButton>
                            <Funnel size={16} />
                        </IconButton>
                    </AnchorMenu>
                    <IconButton onClick={toggleLayout}>
                        {layout == "grid" ? <LayoutGrid size={16} /> : <StretchHorizontal size={16} />}
                    </IconButton>
                </Stack>
                {loading && (
                    <LinearProgress sx={{ position: 'absolute', bottom: -8, left: 0, height: 2, width: '100%' }} />
                )}
            </Stack>

            <Stack
                flex={1}
                sx={{ position: 'relative' }}>
                <AnimatePresence>
                    {Boolean(files && files.length == 0 && !loading) ? (
                        <Stack key={"empty"} justifyContent={"center"} alignItems={"center"} flex={1}>
                            <Typography color='text.secondary' fontWeight={600} fontSize={18}>Tidak ada File</Typography>
                        </Stack>
                    ) : (
                        <Stack
                            key={layout}
                            direction={layout == "grid" ? "row" : "column"}
                            gap={layout == "grid" ? 3 : 0}
                            alignItems={"flex-start"}
                            justifyContent={"flex-start"}
                            flexWrap={"wrap"}>
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
                                    key={`${layout}-${file.id}`}>
                                    <FileView
                                        size={22}
                                        onOpen={handleOpen}
                                        onSelect={setSelected}
                                        selected={file.id == selected?.id}
                                        layout={layout}
                                        file={file}
                                        appendMenu={additionalMenu}
                                    />
                                </motion.div>
                            ))}
                        </Stack>
                    )}
                </AnimatePresence>
            </Stack>
        </Stack>
    );
}