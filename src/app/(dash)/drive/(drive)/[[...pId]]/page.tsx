'use client'

import { getMany } from '@/libs/websocket/query';
import FileContentViewer from '@/viewer/FileContentViewer';
import { CustomFolderViewerComponent } from '@/viewer/modules/FolderViewer';
import { useParams } from 'next/navigation';


export default function page() {

    const { pId } = useParams<{ pId: string[] }>();

    const handleOpen = () => {

    }

    if (pId?.length > 0) {
        return (
            <FileContentViewer />
        )
    }

    return (
        <>
            <CustomFolderViewerComponent
                query={getMany("file").where("pId", "IS NULL")}
                handleOpen={handleOpen} />
        </>
    )
}