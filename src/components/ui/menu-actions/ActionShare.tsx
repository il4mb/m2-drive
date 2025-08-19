import { Share2 } from "lucide-react";
import { createContextMenu } from "../ContextMenuItem";
import { FileContextMenu } from "../drive/FileItem";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Stack,
    MenuItem,
    Autocomplete,
} from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";
import useRequest from "@/components/hooks/useRequest";
import { enqueueSnackbar } from "notistack";

type State = {
    permit: ReturnType<typeof useRequest>;
};

export default createContextMenu<FileContextMenu, State>({
    state({ file }) {
        return {
            permit: useRequest({
                endpoint: "/api/drive",
                method: "POST",
                queryParams: { act: "share" },
            }),
        };
    },
    icon: Share2,
    label: "Berbagi",
    action() {
        return new Promise(() => { });
    },
    component({ payload, state, resolve }) {

        const [generalPermit, setGeneralPermit] = useState<"" | "viewer" | "editor">("");
        const { file, refresh } = payload;
        const link = `${window.location.origin}/file/${file.id}?p=${generalPermit}`;

        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(link);
                enqueueSnackbar("Link disalin", { variant: 'success' })
            } catch {
                alert("Gagal menyalin link");
            }
        }

        const handleUpdatePermit = async (e: ChangeEvent<HTMLInputElement>) => {
            const permit = e.target.value;
            if (!["", "viewer", "editor"].includes(permit)) {
                return enqueueSnackbar("Jenis permit tidak dikenali!", { variant: "warning" });
            }
            await state.permit.send({
                body: {
                    fileId: file.id,
                    generalPermit: permit
                }
            });
            setGeneralPermit(permit as any);
        }

        const handleClose = (exit = true) => {
            refresh();
            resolve(exit);
        }

        useEffect(() => {
            setGeneralPermit(file.meta?.generalPermit || "");
        }, [file]);


        const renderInput = (props: any) => {
            return (<TextField {...props}/>)
        }

        return (
            <Dialog onClose={() => handleClose(false)} open maxWidth="xs" fullWidth>
                <DialogTitle>Berbagi File</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>

                        <Autocomplete
                            renderInput={renderInput}
                            options={[
                                "Ilham",
                                "Nisa",
                                "Shodiq",
                                "Fajar"
                            ]}
                            fullWidth />

                        <TextField
                            disabled={state.permit.pending}
                            select
                            label="Pengaturan Akses"
                            value={generalPermit}
                            onChange={handleUpdatePermit}
                            fullWidth>
                            <MenuItem value="">Nonaktif (Tidak Dibagikan)</MenuItem>
                            <MenuItem value="viewer">Hanya Lihat</MenuItem>
                            <MenuItem value="editor">Dapat Mengedit</MenuItem>
                        </TextField>

                        {/* Tampilkan link hanya jika sudah dipilih izin */}
                        {generalPermit && (
                            <TextField
                                disabled={state.permit.pending}
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
                    <Button size="small" onClick={() => handleClose(false)} color="inherit">
                        Tutup
                    </Button>
                    {generalPermit && (
                        <Button
                            disabled={state.permit.pending}
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
