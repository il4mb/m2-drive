'use client'

import { Folder } from "lucide-react"
import { useViewerManager, ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useMemo, useState } from "react";
import { getMany, Query } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { motion } from "motion/react"
import FileView from "@/components/drive/FileView";
import { Stack } from "@mui/material";
import { useContextMenu } from "@/components/context-menu/ContextMenu";
import { createContextMenu } from "@/components/context-menu/ContextMenuItem";

type CustonFolderViewerComponentProps = {
    files?: File[];
    query: Query<'file', 'list'>;
    handleOpen: (file: File) => void;
}
export const CustomFolderViewerComponent = ({ handleOpen, query }: CustonFolderViewerComponentProps) => {

    const contextMenu = useContextMenu();
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        return contextMenu.addMenu(
            "",
            createContextMenu({
                label: "Test"
            })
        )
    }, [])


    useEffect(() => {
        const unsubscribe = onSnapshot(query, (data) => {
            setFiles(data);
        })
        return unsubscribe;
    }, [query]);

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

export const FolderViewerComponent: React.FC<{ file: File }> = ({ file }) => {

    const query = useMemo(() => getMany("file").where("pId", "==", file.id), [file])
    const { openWithSupportedViewer } = useViewerManager();
    const handleOpen = (file: File) => {
        openWithSupportedViewer(file);
    }

    return (
        <CustomFolderViewerComponent
            query={query}
            handleOpen={handleOpen} />
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