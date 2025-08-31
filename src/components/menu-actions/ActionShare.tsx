import { Share2 } from "lucide-react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Stack, MenuItem } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { enqueueSnackbar } from "notistack";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";
import ContributorManager from "../ContributorManager";
import { shareUserFile } from "@/actions/dive-root";
import { useCurrentSession } from "../context/CurrentSessionProvider";

type State = {
    file: File;
};

type GeneralPermit = "none" | "viewer" | "editor";
export default createContextMenu<State>({
    icon: Share2,
    label: "Berbagi",
    component({ state, resolve }) {

        const { file } = state;
        const { user } = useCurrentSession();
        const [generalPermit, setGeneralPermit] = useState<GeneralPermit>(file.meta?.generalPermit || "none");
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
            if (!user?.id) return;
            const permit = e.target.value as GeneralPermit;
            if (!["none", "viewer", "editor"].includes(permit)) {
                return enqueueSnackbar("Jenis permit tidak dikenali!", { variant: "warning" });
            }
            await shareUserFile({
                fileId: file.id,
                userId: user.id,
                generalPermit: permit
            })
            setGeneralPermit(permit as any);
        }

        const handleClose = (exit = true) => {
            // refresh();
            resolve(exit);
        }

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
                            <MenuItem value="none">Nonaktif (Tidak Dibagikan)</MenuItem>
                            <MenuItem value="viewer">Hanya Lihat</MenuItem>
                            <MenuItem value="editor">Dapat Mengedit</MenuItem>
                        </TextField>

                        {/* Tampilkan link hanya jika sudah dipilih izin */}
                        {["editor", "viewer"].includes(generalPermit) && (
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

