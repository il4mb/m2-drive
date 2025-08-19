'use client'

import useRequest from "@/components/hooks/useRequest";
import { alpha, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Trash } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { createContextMenu } from "../ContextMenuItem";
import { FileContextMenu } from "../drive/FileItem";
import { getColor } from "@/theme/colors";

type State = {
    trash: ReturnType<typeof useRequest>
}
export default createContextMenu<FileContextMenu, State>({
    
    state: ({ file, refresh }) => ({
        trash: useRequest({
            endpoint: "/api/drive",
            method: "POST",
            body: { fileId: file.id },
            queryParams: { act: "delete" },
            onError(err) {
                enqueueSnackbar(err?.message || "Terjadi kesalahan", { variant: "error" });
            },
            onValidate({ body }) {
                return !!body?.fileId;
            },
            onSuccess() {
                enqueueSnackbar("File berhasil dipindahkan ke sampah!", { variant: "success" });
                refresh();
            },
        })
    }),
    icon: Trash,
    label: "Pindah ke Sampah",
    style: {
        background: alpha(getColor('error')[400], 0.1),
        "&:hover": {
            background: alpha(getColor('error')[400], 0.4),
        }
    },
    action() {
        // biarkan kosong, akan dipicu oleh tombol di dalam dialog
        return new Promise(() => { });
    },
    component({ payload, state, resolve }) {
        const { file, refresh } = payload;
        const { trash } = state;

        return (
            <Dialog onClose={() => resolve(false)} open maxWidth="xs" fullWidth>
                <DialogTitle>Konfirmasi Hapus</DialogTitle>
                <DialogContent>
                    <Typography>
                        Apakah kamu yakin ingin menghapus{" "}
                        <strong>{file?.name || "file ini"}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        size="small"
                        onClick={() => resolve(false)}
                        color="inherit">
                        Batal
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={trash.pending}
                        onClick={async () => {
                            await trash.send();
                            resolve();
                            refresh();
                        }}>
                        {trash.pending ? "Menghapus..." : "Hapus"}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
});
