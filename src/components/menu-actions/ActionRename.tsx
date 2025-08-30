import { ChevronRight, Pen } from "lucide-react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import useRequest from "@/hooks/useRequest";
import { renameUserFile } from "@/actions/dive-root";
import RequestError from "../RequestError";

type State = {
    file: File;
}

export default createContextMenu<State>({
    icon: Pen,
    label: "Ganti Nama",
    component({ state, resolve }) {

        const file = state.file;
        const auth = useCurrentSession();
        const [name, setName] = useState<string>(file.name);

        const request = useRequest({
            action: renameUserFile,
            params: {
                name,
                fileId: file.id,
                userId: auth.user?.id || ''
            },
            validator({ name, userId }) {
                if (name.length < 1 || name.length > 34 || !userId) return false;
                return true;
            },
            onSuccess() {
                resolve(true)
            }
        }, [name, auth.user]);

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            if (value.length > 34) return;
            setName(value.replace(/[^a-z0-9_\-\(\)\s]+/gi, ''));
        }


        return (
            <Dialog maxWidth={'xs'} onClose={() => resolve(false)} fullWidth open>
                <DialogTitle>Ganti Nama</DialogTitle>
                <DialogContent sx={{ overflow: 'visible' }}>
                    <RequestError
                        request={request}
                        sx={{ mb: 3 }}
                        closable />
                    <TextField
                        disabled={request.pending}
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
                        disabled={request.pending}
                        size="small"
                        color="inherit"
                        onClick={() => resolve(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={!request.isValid || request.pending}
                        loading={request.pending}
                        onClick={request.send}>
                        Simpan
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})