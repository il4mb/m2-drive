'use client'

import useUserDrive from '@/hooks/useDrive';
import { File } from '@/entity/File';
import { LinearProgress, Stack, Typography } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import { AnimatePresence, motion } from 'motion/react';
import FileView from '@/components/drive/FileView';
import { useContextMenuState } from '@/components/context-menu/ContextMenu';
import { DriveLayoutState } from '../layout';
import FileContent from '@/components/drive/FileContent';
import { useViewerManager } from '@/viewer/ModuleViewerManager';
import FolderViewer, { FolderViewerComponent } from '@/viewer/modules/FolderViewer';
import FileContentViewer from '@/viewer/FileContentViewer';

export interface pageProps {
    children?: ReactNode;
}
export default function page() {

    const { openWithSupportedViewer } = useViewerManager();
    const state = useContextMenuState<DriveLayoutState>();
    const router = useRouter();
    const { pId = [] } = useParams<{ pId: string[] }>();
    const { user } = useCurrentSession();
    const lastpid = pId[pId.length - 1];

    const filter = useMemo(() => ({
        order: state.order,
        sortBy: state.sort
    }), [state.order, state.sort]);
    const keyword = useMemo(() => state.keyword, [state.keyword]);

    const { files, loading, parent } = useUserDrive({
        uId: user?.id || null,
        pId: lastpid,
        filter,
        keyword
    });
    const [selected, setSelected] = useState<File>();

    const handleOpen = (file: File) => {
        return openWithSupportedViewer(file);
    }

    useEffect(() => {
        state.setParent(parent || null);
    }, [parent]);

    useEffect(() => {
        state.setLoading(loading);
    }, [loading]);

    // if (lastpid) {
    //     return (
    //         <FileContentViewer fileId={lastpid} />
    //     )
    // }

    return (
        <Stack
            flex={1}
            sx={{ position: 'relative' }}>
            <AnimatePresence>
                {parent?.type == "file"
                    ? <FileContent file={parent as any} />
                    : (
                        <>
                            {Boolean(files && files.length == 0 && !loading) ? (
                                <Stack key={"empty"} justifyContent={"center"} alignItems={"center"} flex={1}>
                                    <Typography color='text.secondary' fontWeight={600} fontSize={18}>Tidak ada File</Typography>
                                </Stack>
                            ) : (
                                <Stack
                                    key={state.layout}
                                    direction={state.layout == "grid" ? "row" : "column"}
                                    gap={state.layout == "grid" ? 3 : 0}
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
                                                maxWidth: state.layout == "grid" ? '200px' : '100%',
                                                width: '100%'
                                            }}
                                            key={`${state.layout}-${file.id}`}>
                                            <FileView
                                                size={22}
                                                onOpen={handleOpen}
                                                onSelect={setSelected}
                                                selected={file.id == selected?.id}
                                                layout={state.layout}
                                                file={file}
                                            />
                                        </motion.div>
                                    ))}
                                </Stack>
                            )}
                        </>
                    )}

            </AnimatePresence>
        </Stack>
    );
}