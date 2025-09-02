'use client'

import { Tooltip, Typography } from "@mui/material";
import { RotateCcw } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";

type State = {
    file: File;
    restore: (f: File) => Promise<void>;
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
        await state.restore(state.file);
    },
});
