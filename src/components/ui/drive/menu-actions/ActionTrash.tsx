'use client'

import useRequest from "@/components/hooks/useRequest";
import { DriveFile } from "@/entity/DriveFile";
import { MenuItem, Typography } from "@mui/material";
import { RefreshCw, Trash } from "lucide-react";
import { useSnackbar } from "notistack";
import { useDriveRoot } from "../DriveRoot";

export interface Props {
    file: DriveFile;
    onClose?: () => void;
}

export default function ActionTrash({ file, onClose }: Props) {

    const { enqueueSnackbar } = useSnackbar();
    const { refresh } = useDriveRoot();

    const move = useRequest({
        endpoint: "/api/drive",
        method: "POST",
        body: { fileId: file.id },
        queryParams: { act: "delete" },
        onError(err) {
            enqueueSnackbar(err?.message || "Unknown Error", { variant: "error" });
        },
        onValidate({ body }) {
            if (!body?.fileId) return false;
            return true;
        },
        onSuccess() {
            enqueueSnackbar("File berhasil dihapus!", { variant: "success" });
            refresh();
            onClose?.();
        },
    });

    const handleClick = () => move.send();


    return (
        <MenuItem onClick={handleClick} disabled={move.pending}>
            {move.pending
                ? <RefreshCw size={14} className="animate-spin" />
                : <Trash size={14} />}
            <Typography ml={1}>
                Tempat Sampah
            </Typography>
        </MenuItem>
    );
}
