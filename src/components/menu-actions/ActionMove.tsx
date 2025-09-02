'use client'

import { Move } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import FolderPicker from "@/components/drive/FolderPicker";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { moveFile } from "@/server/functions/fileCopyMove";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "../ui/CloseSnackbar";

type State = {
    file: File;
}

export default createContextMenu<State>({
    icon: Move,
    label: "Pindah ke...",
    component({ state, resolve }) {

        const [target, setTarget] = useState<File | null>();
        const [loading, setLoading] = useState(false);

        const handleMove = async () => {
            if (loading) return;
            setLoading(true);


            const result = await invokeFunction(moveFile, {
                sourceId: state.file.id,
                targetId: target?.id || null
            })
            if (!result.success) {
                enqueueSnackbar(result.error || "Unknown Error", {
                    variant: 'error',
                    action: CloseSnackbar
                })
            }

            setLoading(false);
        }

        return (
            <Dialog maxWidth={"xs"} onClose={() => !loading && resolve(false)} fullWidth open>
                <DialogTitle>
                    Pindah Ke...
                </DialogTitle>
                <DialogContent>
                    <FolderPicker
                        disabled={loading}
                        userId={state.file.uId}
                        onSelectedChange={setTarget} />
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={loading}
                        onClick={() => !loading && resolve(true)}
                        color="inherit"
                        size="small">
                        Batal
                    </Button>
                    <Button
                        disabled={loading}
                        onClick={handleMove}
                        color="primary"
                        size="small">
                        Pindah Ke {target ? target.name : "My Drive"}
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})
