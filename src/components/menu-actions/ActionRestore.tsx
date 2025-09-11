'use client'

import { Tooltip, Typography } from "@mui/material";
import { RotateCcw } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entities/File";
import { enqueueSnackbar } from "notistack";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import CloseSnackbar from "../ui/CloseSnackbar";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import { useMyPermission } from "@/hooks/useMyPermission";

type State = {
    file: File;
}
export default createContextMenu<State>({
    state() {
        return {
            canEditFile: useMyPermission('can-edit-file'),
            canEditFolder: useMyPermission('can-edit-folder'),
            session: useCurrentSession()
        }
    },
    show({ session }) {
        return Boolean(session?.user);
    },
    icon: RotateCcw,
    label: ({ state }) => (
        <Tooltip title={`Pulihkan ${state.file.name}`}>
            <Typography overflow={"hidden"} textOverflow={"ellipsis"} whiteSpace={"nowrap"}>
                {`Pulihkan ${state.file.name}`}
            </Typography>
        </Tooltip>
    ),
    async action(state) {

        const isPermitted = state.file.type == "file" ? state.canEditFile : state.canEditFolder;
        if (!isPermitted) {
            enqueueSnackbar(`Kamu tidak memiliki izin untuk mengedit ${state.file.type}, kamu tidak dapat memulihkan ${state.file.type}`);
            return;
        }
        const response = await invokeFunction("restoreFile", { fileId: state.file.id });
        if (!response.success) {
            enqueueSnackbar(response.error || "Unknown Error", { variant: 'error', action: CloseSnackbar })
        }
    },
});
