'use client'

import { Tooltip, Typography } from "@mui/material";
import { RotateCcw } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { enqueueSnackbar } from "notistack";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { restoreFile } from "@/server/functions/fileTrash";
import CloseSnackbar from "../ui/CloseSnackbar";

type State = {
    file: File;
}
export default createContextMenu<State>({

    icon: RotateCcw,
    label: ({ state }) => (
        <Tooltip title={`Pulihkan ${state.file.name}`}>
            <Typography overflow={"hidden"} textOverflow={"ellipsis"}>
                {`Pulihkan ${state.file.name}`}
            </Typography>
        </Tooltip>
    ),
    async action(state) {
        const response = await invokeFunction(restoreFile, { fileId: state.file.id });
        if (!response.success) {
            enqueueSnackbar(response.error || "Unknown Error", { variant: 'error', action: CloseSnackbar })
        }
    },
});
