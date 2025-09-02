'use client'

import { Copy } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import FolderPicker from "@/components/drive/FolderPicker";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { copyFile } from "@/server/functions/fileCopyMove";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "../ui/CloseSnackbar";

type State = {
    file: File;
}

export default createContextMenu<State>({
    icon: Copy,
    label: "Salin ke...",
    component({ state, resolve }) {

        const [target, setTarget] = useState<File | null>();
        const [loading, setLoading] = useState(false);

        const handleCopy = async () => {
            if (loading) return;
            setLoading(true);

            const result = await invokeFunction(copyFile, {
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
                    Salin Ke...
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
                        onClick={handleCopy}
                        color="primary"
                        size="small">
                        Salin Ke {target ? target.name : "My Drive"}
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})
