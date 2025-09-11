'use client'

import { Alert, AlertTitle, alpha, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Key, Trash } from "lucide-react";
import { getColor } from "@/theme/colors";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entities/File";
import { useRemoveFile } from "@/hooks/useFileRemove";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import { useMyPermission } from "@/hooks/useMyPermission";

type State = {
    file: File;
}
export default createContextMenu<State>({
    state() {
        return {
            canDeleteFile: useMyPermission("can-delete-file"),
            canDeleteFolder: useMyPermission("can-delete-folder"),
            session: useCurrentSession()
        }
    },
    show({ session }) {
        return Boolean(session?.user);
    },
    icon: Trash,
    label: ({ state }) => (`Hapus ${state.file.type[0].toUpperCase() + state.file.type.slice(1)}`),
    style: () => ({
        background: alpha(getColor('error')[400], 0.1),
        "&:hover": {
            background: alpha(getColor('error')[400], 0.4),
        }
    }),
    component({ state, resolve }) {

        const { file } = state;
        const isPermitted = file.type == "file" ? state.canDeleteFile : state.canDeleteFolder;
        const { remove, loading, error } = useRemoveFile(file.uId);
        const handleSubmit = () => remove(file.id, true);

        return (
            <Dialog onClose={() => resolve(false)} open maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: getColor('error')[300] }}>
                    Konfirmasi Hapus
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error">
                            <AlertTitle>Failed</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    {!isPermitted && (
                        <Alert
                            icon={<Key size={18} />}
                            variant="outlined"
                            severity="warning"
                            sx={{ mb: 2 }}>
                            Kamu tidak memiliki izin untuk menghapus {state.file.type}, kamu tidak dapat menghapus {state.file.type}.
                        </Alert>
                    )}

                    <Typography mb={2}>
                        Apakah kamu yakin ingin menghapus {file.type}{" "}
                        <strong>{file.name}</strong>?
                    </Typography>

                    <Alert severity={"warning"}>
                        File akan dihapus secara permanen dan tidak dapat dikembalikan!
                    </Alert>

                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={loading}
                        size="small"
                        onClick={() => resolve(true)}
                        color="inherit">
                        Batal
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={loading}
                        onClick={handleSubmit}>
                        Hapus
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
});
