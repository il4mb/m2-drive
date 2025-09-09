'use client'

import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import { File } from '@/entities/File';
import { getMany } from '@/libs/websocket/query';
import FileContentViewer from '@/viewer/FileContentViewer';
import { CustomFolderViewerComponent } from '@/viewer/modules/FolderViewer';
import { useViewerManager } from '@/viewer/ModuleViewerManager';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';


export default function page() {

    const { openWithSupportedViewer } = useViewerManager();
    const session = useCurrentSession();
    const query = useMemo(() => getMany("file").where("pId", "IS NULL").where("uId", "==", session.userId), [session]);
    const { pId } = useParams<{ pId: string[] }>();

    const handleOpen = (file: File) => {
        openWithSupportedViewer(file);
    }

    if (pId?.length > 0) {
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