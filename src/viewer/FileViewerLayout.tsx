'use client'

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useMemo, useState } from 'react';
import { ModuleViewerManager } from './ModuleViewerManager';
import FileViewersProvider from '@/components/file-viewers/FileViewersProvider';
import { IconButton, Skeleton, Stack, Typography } from '@mui/material';
import StickyHeader from '@/components/navigation/StickyHeader';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { File } from '@/entities/File';
import { FileIcon } from '@untitledui/file-icons';
import { formatFileSize } from '@/libs/utils';
import WhoViewer from '@/components/file-viewers/WhoViewer';
import { useContextMenu } from '@/components/context-menu/ContextMenu';

export interface FileViewerLayoutProps {
    children?: ReactNode;
    pathList: string[];
    currentPath?: string;
    pageEndpoint: string;
    endpointResolve?: (file: File, endpoint: string) => string;
    canGoBack?: boolean;
}
export default function FileViewerLayout({ children, pathList, pageEndpoint, endpointResolve, canGoBack: canGobackInitial }: FileViewerLayoutProps) {

    const contextMenu = useContextMenu();
    const router = useRouter();

    const [canGoBack, setCanGoBack] = useState(false);
    const lastId = pathList[pathList.length - 1];
    const firstId = pathList?.[0];
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        setCanGoBack(canGobackInitial || pathList.length > 1);
    }, [pathList, canGobackInitial]);


    useEffect(() => {
        return contextMenu?.addState({ folder: file });
    }, [file]);

    const stateValue = useMemo(() => ({
        lastId, firstId, listId: pathList, setFile
    }), [pathList, pageEndpoint]);



    return (
        <Context.Provider value={stateValue}>
            <AnimatePresence mode={'wait'}>
                <Stack flex={1} overflow={"hidden"} sx={{ maxWidth: 1600, mx: 'auto', width: '100%' }}>
                    <ModuleViewerManager endpoint={pageEndpoint} endpointResolve={endpointResolve}>
                        <FileViewersProvider path={pathList}>
                            <Stack flex={1} overflow={"hidden"}>
                                <StickyHeader sx={{ top: 8 }}>
                                    <Stack flex={1} direction={"row"} alignItems={"center"} spacing={1}>
                                        {canGoBack && (
                                            <IconButton onClick={router.back}>
                                                <ArrowLeft size={20} />
                                            </IconButton>
                                        )}
                                        <Stack flex={1} direction={"row"} alignItems={"center"}>
                                            {file ? (

                                                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                                    <Stack minWidth={30} justifyContent={"center"} alignItems={"center"}>
                                                        {file.type == "folder"
                                                            ? <FolderOpen size={30} />
                                                            : <FileIcon
                                                                size={30}
                                                                variant="solid"
                                                                // @ts-ignore
                                                                type={file.meta.mimeType} />}
                                                    </Stack>
                                                    <Stack>
                                                        <Typography component={"div"}>
                                                            {file.name}
                                                        </Typography>
                                                        <Typography variant='caption' color='text.secondary'>
                                                            {file.type == "file"
                                                                ? formatFileSize((file.meta as any).size || 0)
                                                                : (file.meta as any).itemCount + " item"}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            ) : (
                                                <Stack flex={1} direction={"row"} spacing={1} alignItems={"flex-end"}>
                                                    <Skeleton component={"div"} variant='rounded' width={30} height={30} />
                                                    <Skeleton component={"div"} variant='rounded' width={150} height={20} />
                                                </Stack>
                                            )}
                                        </Stack>
                                        <Stack ml={"auto"}>
                                            <WhoViewer />
                                        </Stack>
                                    </Stack>
                                </StickyHeader>
                                {children}
                            </Stack>
                        </FileViewersProvider>
                    </ModuleViewerManager>
                </Stack>
            </AnimatePresence>
        </Context.Provider>
    );
}





type ContextState = {
    lastId: string;
    listId: string[];
    firstId: string;
    setFile: Dispatch<SetStateAction<File | null>>
}
const Context = createContext<ContextState | undefined>(undefined);


export const useFileViewerLayout = (): ContextState => {
    const context = useContext(Context);

    return context as ContextState;
}