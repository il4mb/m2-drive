'use client'

import { useDrive } from "@/components/context/DriveProvider";
import useRequest from "@/components/hooks/useRequest";
import { DriveFile } from "@/entity/DriveFile";
import { MenuItem, Typography } from "@mui/material";
import { Move, RefreshCw } from "lucide-react";
import { useSnackbar } from "notistack";
import { useDriveRoot } from "../DriveRoot";

export interface ActionMoveProps {
    file: DriveFile;
    onClose?: () => void;
}

export default function ActionMove({ file, onClose }: ActionMoveProps) {

    const { enqueueSnackbar } = useSnackbar();
    const { openFolderPicker } = useDrive();
    const { refresh } = useDriveRoot();

    const move = useRequest({
        endpoint: "/api/drive",
        method: "POST",
        onError(err) {
            enqueueSnackbar(err?.message || "Unknown Error", { variant: "error" });
        },
        onValidate({ body }) {

            if (!body) return false;

            if (body.fId === file.id) {
                enqueueSnackbar("Tidak dapat memindah ke folder yang sama!", { variant: 'warning' });
                console.warn("Tidak dapat memindah ke folder yang sama!");
                return false;
            }

            if (body?.fId === file.fId) {
                enqueueSnackbar("Tidak dapat memindah ke folder asal!", { variant: 'warning' });
                console.warn("Tidak dapat memindah ke folder asal!");
                return false;
            }
            return true;
        },
        onSuccess() {
            enqueueSnackbar("File berhasil dipindah!", { variant: "success" });
            refresh();
            onClose?.();
        },
    });

    const handleClick = async () => {
        const picked = await openFolderPicker("Pindah ke...", [file.id]);
        move.send({ body: { targetId: picked?.id || null, sourceId: file.id }, queryParams: { act: "move" } });
    }

    return (
        <MenuItem onClick={handleClick} disabled={move.pending}>
            {move.pending
                ? <RefreshCw size={14} className="animate-spin" />
                : <Move size={14} />}
            <Typography ml={1}>
                Pindah ke...
            </Typography>
        </MenuItem>
    );
}
