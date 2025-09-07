'use client'

import { Copy } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import FolderPicker from "@/components/drive/FolderPicker";
import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { copyFile } from "@/server/functions/fileCopyMove";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "../ui/CloseSnackbar";
import { useFileTags } from "@/hooks/useFileTag";
import { useCurrentSession } from "../context/CurrentSessionProvider";

type State = {
    file: File;
}

export default createContextMenu<State>({
    state() {
        return {
            session: useCurrentSession()
        }
    },
    show({ session }) {
        return Boolean(session?.user);
    },
    icon: Copy,
    label: "Salin ke...",
    component({ state, resolve }) {

        const noClone = useFileTags(state.file, ['no-clone', 'no-edit']);
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
                    {noClone && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Peringatan!</AlertTitle>
                            <strong>Admin</strong> menandai file ini  <strong>{state.file.meta?.tags?.join(', ')}</strong>,<br />Menyalin file ini mungkin tidak berhasil!
                        </Alert>
                    )}
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
