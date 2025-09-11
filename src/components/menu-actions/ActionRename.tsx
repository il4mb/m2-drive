'use client'

import { Key, Pen } from "lucide-react";
import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entities/File";
import { useFileUpdate } from "@/hooks/useFileUpdate";
import { useFileTags } from "@/hooks/useFileTag";
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
    icon: Pen,
    label: "Ganti Nama",
    component({ state, resolve }) {

        const file = state.file;
        const isPermitted = file.type == "file" ? state.canEditFile : state.canEditFolder;
        const noEdit = useFileTags(file, ['no-edit']);
        const [name, setName] = useState<string>(file.name);
        const { update, loading, error } = useFileUpdate(file.id);
        const isValid = name.length > 0 && name != file.name;

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            if (value.length > 112) return;
            setName(value.replace(/[^a-z0-9_\-\(\)\.\s]+/gi, ''));
        }

        const handleSubmit = () => {
            update({ name }).then(e => {
                if (e) {
                    resolve(true);
                }
            })
        }

        return (
            <Dialog maxWidth={'xs'} onClose={() => resolve(false)} fullWidth open>
                <DialogTitle>Ganti Nama</DialogTitle>
                <DialogContent sx={{ overflow: 'visible' }}>

                    {noEdit && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Peringatan!</AlertTitle>
                            <strong>Admin</strong> menandai folder ini  <strong>{file.meta?.tags?.join(', ')}</strong>, <br />Mengganti nama mungkin tidak berhasil!
                        </Alert>
                    )}
                    {!isPermitted && (
                        <Alert
                            icon={<Key size={18} />}
                            variant="outlined"
                            severity="warning"
                            sx={{ mb: 2 }}>
                            Kamu tidak memiliki izin untuk mengedit {state.file.type}, kamu tidak dapat mengganti nama {state.file.type}.
                        </Alert>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <AlertTitle>Error</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        disabled={loading}
                        value={name}
                        onChange={handleChange}
                        label="Nama"
                        autoFocus
                        fullWidth />
                    <Typography component={"small"} fontSize={12}>
                        {name.length} / 1 - 112
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={loading}
                        size="small"
                        color="inherit"
                        onClick={() => resolve(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={!isValid || loading}
                        loading={loading}
                        onClick={handleSubmit}>
                        Simpan
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})