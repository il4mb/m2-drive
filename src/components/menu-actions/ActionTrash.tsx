'use client'

import { Alert, AlertTitle, alpha, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Typography } from "@mui/material";
import { Key, Trash } from "lucide-react";
import { getColor } from "@/theme/colors";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entities/File";
import { useState } from "react";
import { useRemoveFile } from "@/hooks/useFileRemove";
import { useFileTags } from "@/hooks/useFileTag";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import { useMyPermission } from "@/hooks/useMyPermission";

type State = {
    file: File
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
        const noTrash = useFileTags(state.file, ['no-remove', 'no-edit']);
        //@ts-ignore
        const [permanen, setPermanen] = useState(file.type == "folder" && file.meta.itemCount == 0 ? true : false);
        const { remove, loading, error } = useRemoveFile(file.uId);
        const handleSubmit = () => remove(file.id, permanen);

        return (
            <Dialog onClose={() => resolve(false)} open maxWidth="xs" fullWidth>
                <DialogTitle>
                    Konfirmasi Hapus
                </DialogTitle>
                <DialogContent>
                    {noTrash && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Peringatan!</AlertTitle>
                            <strong>Admin</strong> menandai file ini <strong>{file.meta?.tags?.join(', ')}</strong>, <br />Menghapus file ini mungkin tidak berhasil!
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

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <AlertTitle>Failed</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    <Typography>
                        Apakah kamu yakin ingin menghapus {file.type}{" "}
                        <strong>{file.name}</strong>?
                    </Typography>

                    <FormControlLabel
                        control={<Checkbox
                            disabled={loading}
                            checked={permanen}
                            onChange={e => setPermanen(e.target.checked)} />}
                        label={"Hapus permanen?"} />
                    <Alert severity={permanen ? "warning" : "info"}>
                        {permanen
                            ? "File akan dihapus secara permanen dan tidak dapat dikembalikan!"
                            : "File akan dimasukan ke tempat sampah selama 30 hari dan setelah itu dihapus permanen."}
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
                        disabled={!isPermitted || loading}
                        onClick={handleSubmit}>
                        Hapus
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
});
