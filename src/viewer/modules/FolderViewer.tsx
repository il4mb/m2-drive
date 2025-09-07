'use client'

import { Folder } from "lucide-react"
import { useViewerManager, ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useState } from "react";
import { getMany } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { motion } from "motion/react"
import FileView from "@/components/drive/FileView";
import { Stack } from "@mui/material";



export const FolderViewerComponent: React.FC<{ file: File }> = ({ file }) => {

    const [files, setFiles] = useState<File[]>([]);
    const { openWithSupportedViewer } = useViewerManager();

    const handleOpen = (file: File) => {
        openWithSupportedViewer(file);
    }



    useEffect(() => {
        const query = getMany("file").where("pId", "==", file.id);
        const unsubscribe = onSnapshot(query, (data) => {
            setFiles(data);
        })
        return unsubscribe;
    }, [file]);


    return (
        <Stack flex={1} width={"100%"} height={"100%"}>
            {files.map((file, i) => (
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        delay: 0.02 * i
                    }}
                    style={{
                        // maxWidth: state.layout == "grid" ? '200px' : '100%',
                        width: '100%'
                    }}
                    key={`${file.id}`}>
                    <FileView
                        size={22}
                        onOpen={handleOpen}
                        // onSelect={setSelected}
                        // selected={file.id == selected?.id}
                        // layout={state.layout}
                        file={file}
                    />
                </motion.div>
            ))}
        </Stack>
    )
}

export default {
    priority: 10,
    id: 'folder',
    name: "Folder",
    icon: <Folder size={18} />,
    supports: (_, file) => file.type == "folder",
    component: FolderViewerComponent
} as ViewerModule;