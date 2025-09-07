'use client'

import { Pen } from "lucide-react";
import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { useFileUpdate } from "@/hooks/useFileUpdate";
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
    icon: Pen,
    label: "Ganti Nama",
    component({ state, resolve }) {

        const file = state.file;
        const noEdit = useFileTags(file, ['no-edit']);
        const [name, setName] = useState<string>(file.name);
        const { update, loading, error } = useFileUpdate(file.id);
        const isValid = name.length > 0 && name != file.name;

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            if (value.length > 34) return;
            setName(value.replace(/[^a-z0-9_\-\(\)\s]+/gi, ''));
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
                        {name.length} / 1 - 34
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