'use client'

import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { useViewerForFile, useViewerManager } from "../../viewer/ModuleViewerManager";

type State = {
    file: File;
    onOpen?: (f: File) => void;
};

export default createContextMenu<State>({
    state({ file }) {
        const { openWithSupportedViewer } = useViewerManager();
        const module = useViewerForFile(file);
        return {
            module,
            openWithSupportedViewer
        }
    },
    icon: ({ state }) => (
        <>
            {state.module?.icon}
        </>
    ),
    label({ state }) {

        const { file, module } = state;
        if (file.type === "folder") return "Buka Folder";

        return (
            <>Buka Dengan <strong>{module?.name}</strong></>
        );
    },
    action({ onOpen, file, module, openWithSupportedViewer }) {
        if (module) {
            return openWithSupportedViewer(file, module.id);
        }
        onOpen?.(file);
    },
});