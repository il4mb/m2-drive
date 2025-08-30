import { ChevronRight, Folder, FolderPlus, HardDrive } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import useRequest from "@/hooks/useRequest";
import { createUserFolder } from "@/actions/dive-root";
import { useCurrentSession } from "@/components/context/CurrentSessionProvider";
import RequestError from "@/components/RequestError";
import { File } from "@/entity/File";


export default createContextMenu<{ file: File | null }>({
    icon: FolderPlus,
    label: "Buat Folder",
    component({ state, resolve }) {

        const file = state.file;
        const auth = useCurrentSession();
        const [name, setName] = useState<string>('');

        const request = useRequest({
            action: createUserFolder,
            params: {
                name,
                pId: file?.id || null,
                uId: auth.user?.id
            },
            validator({ name }) {
                if (name.length < 1 || name.length > 34) return false;
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
                <DialogTitle>Buat Folder</DialogTitle>
                <DialogContent sx={{ overflow: 'visible' }}>
                    <RequestError request={request} sx={{ mb: 3 }} closable />
                    <Stack direction={"row"} spacing={1} mb={2} alignItems={"center"}>
                        <ChevronRight />
                        <Stack direction={"row"} spacing={1} mb={2} alignItems={"center"} borderBottom={'1px solid'}>
                            {file ? (
                                <>
                                    <Folder />
                                    <Typography>{file.name}</Typography>
                                </>) : (
                                <>
                                    <HardDrive />
                                    <Typography>My Drive</Typography>
                                </>)}
                        </Stack>
                    </Stack>
                    <TextField value={name} onChange={handleChange} label="Nama Folder" fullWidth />
                    <Typography component={"small"} fontSize={12}>
                        {name.length} / 1 - 34
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button size="small" color="inherit" onClick={() => resolve(false)}>Batal</Button>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={!request.isValid}
                        loading={request.pending}
                        onClick={request.send}>
                        Buat
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})