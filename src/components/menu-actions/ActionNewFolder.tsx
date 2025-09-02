'use client'

import { ChevronRight, Folder, FolderPlus, HardDrive } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useMemo, useState } from "react";
import { File } from "@/entity/File";
import { useCreateFolder } from "@/hooks/useFolderCreate";
import { useCurrentSession } from "../context/CurrentSessionProvider";
import useUser from "@/hooks/useUser";
import { useFileTags } from "@/hooks/useFileTag";

export default createContextMenu<{ folder: File | null, userId: string }>({
    icon: FolderPlus,
    label: "Buat Folder",
    component({ state, resolve }) {

        const auth = useCurrentSession();
        const { user } = useUser(state.userId);

        const folder = state.folder;
        const noClone = useFileTags(folder, ['no-append']);

        const createFolder = useCreateFolder(state.userId);
        const [name, setName] = useState<string>('');
        const rootLabel = useMemo(() => user && auth.user && auth.user?.id != user?.id ? `${user?.name} Drive` : `My Drive`, [user, auth]);

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            if (value.length > 34) return;
            setName(value.replace(/[^a-z0-9_\-\(\)\s]+/gi, ''));
        }

        const handleCreate = async () => {
            if (folder && folder.type != "folder") return;
            const success = await createFolder.create(name, folder?.id || null);
            if (success) {
                resolve(true);
            }
        }

        return (
            <Dialog maxWidth={'xs'} onClose={() => resolve(false)} fullWidth open>
                <DialogTitle>Buat Folder</DialogTitle>
                <DialogContent sx={{ overflow: 'visible' }}>

                    {noClone && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Peringatan!</AlertTitle>
                            <strong>Admin</strong> menandai folder ini  <strong>{folder?.meta?.tags?.join(', ')}</strong>, <br />Membuat folder turunan mungkin tidak berhasil!
                        </Alert>
                    )}


                    {createFolder.error && (
                        <Alert severity="error" sx={{ mb: 2}}>
                            <AlertTitle>Failed</AlertTitle>
                            {createFolder.error}
                        </Alert>
                    )}
                    <Stack direction={"row"} spacing={1} mb={2} alignItems={"center"}>
                        <ChevronRight />
                        <Stack direction={"row"} spacing={1} mb={2} alignItems={"center"} borderBottom={'1px solid'}>
                            {folder ? (
                                <>
                                    <Folder />
                                    <Typography>{folder.name}</Typography>
                                </>) : (
                                <>
                                    <HardDrive />
                                    <Typography>{rootLabel}</Typography>
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