import { Share2 } from "lucide-react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Stack,
    MenuItem,
} from "@mui/material";
import { ChangeEvent, useState } from "react";
import { enqueueSnackbar } from "notistack";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import ContributorManager from "../ContributorManager";

type State = {
    file: File;
};

export default createContextMenu<State>({
    icon: Share2,
    label: "Berbagi",
    component({ state, resolve }) {

        const [generalPermit, setGeneralPermit] = useState<"" | "viewer" | "editor">("");
        const { file } = state;
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
            // await state.permit.send({
            //     body: {
            //         fileId: file.id,
            //         generalPermit: permit
            //     }
            // });
            setGeneralPermit(permit as any);
        }

        const handleClose = (exit = true) => {
            // refresh();
            resolve(exit);
        }

        // useEffect(() => {
        //     setGeneralPermit(file.meta?.generalPermit || "");
        // }, [file]);


        return (
            <Dialog onClose={() => handleClose(false)} open maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Share2 />
                    Berbagi File
                </DialogTitle>
                <DialogContent>
                    <Stack gap={2} mt={1}>

                        <Stack mb={1}>
                            <ContributorManager file={file} />
                        </Stack>

                        <TextField
                            // disabled={state.permit.pending}
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
                                // disabled={state.permit.pending}
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
                            // disabled={state.permit.pending}
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

