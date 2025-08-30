'use client'

import { Copy } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import FolderPicker from "@/components/drive/FolderPicker";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import { useState } from "react";
import { copyUserFile } from "@/actions/dive-root";

type State = {
    file: File;
}

export default createContextMenu<State>({
    icon: Copy,
    label: "Salin ke...",
    component({ state, resolve }) {

        const { user } = useCurrentSession();
        const [file, setFile] = useState<File | null>();
        const [loading, setLoading] = useState(false);

        const handleCopy = async () => {
            if (!user || loading) return;
            setLoading(true);

            try {

                await copyUserFile({
                    uId: user.id,
                    sourceId: state.file.id,
                    targetId: file?.id || null
                });

            } catch (e: any) {

            } finally {
                setLoading(false);
            }
        }

        if (!user) return;

        return (
            <Dialog maxWidth={"xs"} onClose={() => !loading && resolve(false)} fullWidth open>
                <DialogTitle>
                    Salin Ke...
                </DialogTitle>
                <DialogContent>
                    <FolderPicker
                        disabled={loading}
                        userId={user.id}
                        onSelectedChange={setFile} />
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
                        Salin Ke {file ? file.name : "My Drive"}
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})
