'use client'

import { Alert, AlertTitle, alpha, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Typography } from "@mui/material";
import { Trash } from "lucide-react";
import { getColor } from "@/theme/colors";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { useState } from "react";
import useRequest from "@/hooks/useRequest";
import { removeUserFile } from "@/actions/dive-root";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import RequestError from "../RequestError";
import { useRemoveFile } from "@/hooks/useRemoveFile";

type State = {
    file: File
}
export default createContextMenu<State>({

    icon: Trash,
    label: ({ state }) => (`Hapus ${state.file.type[0].toUpperCase() + state.file.type.slice(1)}`),
    style: () => ({
        background: alpha(getColor('error')[400], 0.1),
        "&:hover": {
            background: alpha(getColor('error')[400], 0.4),
        }
    }),
    component({ state, resolve }) {

        const { user } = useCurrentSession();
        const { file } = state;
        //@ts-ignore
        const [permanen, setPermanen] = useState(file.type == "folder" && file.meta.itemCount == 0 ? true : false);
        const { remove, loading, error } = useRemoveFile(user?.id);
        const handleSubmit = () => remove(file.id, permanen);

        return (
            <Dialog onClose={() => resolve(false)} open maxWidth="xs" fullWidth>
                <DialogTitle>
                    Konfirmasi Hapus
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error">
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
                        disabled={loading}
                        onClick={handleSubmit}>
                        Hapus
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
});
