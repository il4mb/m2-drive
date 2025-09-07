'use client'

import useUser from '@/hooks/useUser';
import { File } from '@/entity/File';
import { useParams } from 'next/navigation';
import { ReactNode, useMemo } from 'react';
import { useViewerManager } from '@/viewer/ModuleViewerManager';
import { getMany } from '@/libs/websocket/query';
import FileContentViewer from '@/viewer/FileContentViewer';
import { CustomFolderViewerComponent } from '@/viewer/modules/FolderViewer';

export interface pageProps {
    children?: ReactNode;
}
export default function page() {

    const { uId, fId } = useParams<{ uId: string, fId: string[] }>();

    const { openWithSupportedViewer } = useViewerManager();
    const query = useMemo(() => getMany("file").where("pId", "IS NULL").where("uId", "==", uId), [uId]);
    const handleOpen = (file: File) => {
        openWithSupportedViewer(file);
    }

    

    if (fId?.length > 0) {
        return (
            <FileContentViewer />
        )
    }

    return (
        <>
            <CustomFolderViewerComponent
                query={query}
                handleOpen={handleOpen} />
        </>
    )
}