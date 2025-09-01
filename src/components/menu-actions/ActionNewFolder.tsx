'use client'

import { ChevronRight, Folder, FolderPlus, HardDrive } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { useCurrentSession } from "@/components/context/CurrentSessionProvider";
import { File } from "@/entity/File";
import { useCreateFolder } from "@/hooks/useCreateFolder";


export default createContextMenu<{ file: File | null }>({
    icon: FolderPlus,
    label: "Buat Folder",
    component({ state, resolve }) {

        const file = state.file;
        const auth = useCurrentSession();
        const createFolder = useCreateFolder(auth.user?.id);
        const [name, setName] = useState<string>('');

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            if (value.length > 34) return;
            setName(value.replace(/[^a-z0-9_\-\(\)\s]+/gi, ''));
        }

        const handleCreate = async () => {
            const success = await createFolder.create(name, file?.id || null);
            if (success) {
                resolve(true);
            }
        }

        return (
            <Dialog maxWidth={'xs'} onClose={() => resolve(false)} fullWidth open>
                <DialogTitle>Buat Folder</DialogTitle>
                <DialogContent sx={{ overflow: 'visible' }}>
                    {createFolder.error && (
                        <Alert severity="error">
                            <AlertTitle>Failed</AlertTitle>
                            {createFolder.error}
                        </Alert>
                    )}
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
                    <TextField
                        disabled={createFolder.loading}
                        value={name}
                        onChange={handleChange}
                        label="Nama Folder" fullWidth />
                    <Typography component={"small"} fontSize={12}>
                        {name.length} / 1 - 34
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={createFolder.loading}
                        size="small"
                        color="inherit"
                        onClick={() => resolve(false)}>Batal</Button>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={name.length <= 0}
                        loading={createFolder.loading}
                        onClick={handleCreate}>
                        Buat
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})