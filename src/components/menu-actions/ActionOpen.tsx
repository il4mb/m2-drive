'use client'

import { FolderOpen } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { useViewerForFile, ViewerModule } from "../context/ViewerManager";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type State = {
    file: File;
    onOpen?: (f: File) => void;
};

type AdditionalState = {
    module: ViewerModule | null;
    router: AppRouterInstance;
};

export default createContextMenu<State>({
    state({ file }) {
        const router = useRouter();
        const module = useViewerForFile(file);
        return {
            module,
            router
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
    action({ onOpen, file, module, router }) {
        if (module) {
            return router.push(`/open/${file.id}?with=${module.id}`);
        }
        onOpen?.(file);
    },
});