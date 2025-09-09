'use client'

import { Share2 } from "lucide-react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Stack, MenuItem, LinearProgress, Alert, AlertTitle } from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";
import { enqueueSnackbar } from "notistack";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entities/File";
import ContributorManager from "../ContributorManager";
import { useFileUpdate } from "@/hooks/useFileUpdate";
import CloseSnackbar from "../ui/CloseSnackbar";
import { useFileTags } from "@/hooks/useFileTag";
import { useCurrentSession } from "../context/CurrentSessionProvider";

type State = {
    file: File;
};

type GeneralPermit = "none" | "viewer" | "editor";
export default createContextMenu<State>({
    state() {
        return {
            session: useCurrentSession()
        }
    },
    show({ session }) {
        return Boolean(session?.user);
    },
    icon: Share2,
    label: "Berbagi",
    component({ state, resolve }) {

        const { file } = state;
        const noShare = useFileTags(state.file, ['no-share']);
        const { update, loading, error } = useFileUpdate(file.id);
        const [generalPermit, setGeneralPermit] = useState<GeneralPermit>(
            // @ts-ignore
            () => ["none", "viewer", "editor"].includes(file.meta?.generalPermit) ? file.meta?.generalPermit : "none");
        const link = `${window.location.origin}/shared/${file.id}?p=${generalPermit}`;

        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(link);
                enqueueSnackbar("Link disalin", { variant: 'success' })
            } catch {
                alert("Gagal menyalin link");
            }
        }

        const handleUpdatePermit = async (e: ChangeEvent<HTMLInputElement>) => {
            const permit = e.target.value as GeneralPermit;
            if (!["none", "viewer", "editor"].includes(permit)) {
                return enqueueSnackbar("Jenis permit tidak dikenali!", { variant: "warning" });
            }
            // @ts-ignore
            const success = await update({ meta: { generalPermit: permit } });
            if (!success) {
                enqueueSnackbar(error || "Unknown Error", {
                    variant: 'error',
                    action: CloseSnackbar
                })
            }
        }

        const handleClose = (exit = true) => {
            resolve(exit);
        }


        useEffect(() => {
            // @ts-ignore
            setGeneralPermit(file.meta.generalPermit);
        }, [file])



        return (
            <Dialog onClose={() => handleClose(false)} open maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Share2 />
                    Berbagi File
                </DialogTitle>
                <DialogContent>
                    <Stack gap={2} mt={1}>
                        {noShare && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <AlertTitle>Peringatan!</AlertTitle>
                                <strong>Admin</strong> menandai file ini  <strong>{file.meta?.tags?.join(', ')}</strong>, <br />Membagikan file ini mungkin tidak berhasil!
                            </Alert>
                        )}

                        <Stack mb={1}>
                            <ContributorManager file={file} />
                        </Stack>

                        {loading && (
                            <LinearProgress sx={{ height: 2 }} />
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <AlertTitle>Error</AlertTitle>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            disabled={loading}
                            select
                            label="Pengaturan Akses"
                            value={generalPermit}
                            onChange={handleUpdatePermit}
                            fullWidth>
                            <MenuItem value="none">Nonaktif (Tidak Dibagikan)</MenuItem>
                            <MenuItem value="viewer">Hanya Lihat</MenuItem>
                            <MenuItem value="editor">Dapat Mengedit</MenuItem>
                        </TextField>

                        {/* Tampilkan link hanya jika sudah dipilih izin */}
                        {["editor", "viewer"].includes(generalPermit) && (
                            <TextField
                                disabled={loading}
                                label="Link berbagi"
                                value={link}
                                fullWidth
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                    },
                                }}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={loading}
                        size="small"
                        onClick={() => handleClose(false)}
                        color="inherit">
                        Tutup
                    </Button>
                    {generalPermit && (
                        <Button
                            disabled={loading}
                            onClick={handleCopy}
                            size="small"
                            variant="outlined">
                            Salin Link
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        );
    },
});

