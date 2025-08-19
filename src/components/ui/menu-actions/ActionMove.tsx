'use client'

import { useDrive } from "@/components/context/DriveProvider";
import useRequest from "@/components/hooks/useRequest";
import { Move } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { createContextMenu } from "../ContextMenuItem";
import { FileContextMenu } from "../drive/FileItem";


type State = {
    drive: ReturnType<typeof useDrive>,
    move: ReturnType<typeof useRequest>
}

export default createContextMenu<FileContextMenu, State>({
    icon: Move,
    label: "Pindah ke...",

    state: ({ refresh, file }) => ({
        drive: useDrive(),
        move: useRequest({
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

                if (body?.fId === file.pId) {
                    enqueueSnackbar("Tidak dapat memindah ke folder asal!", { variant: 'warning' });
                    console.warn("Tidak dapat memindah ke folder asal!");
                    return false;
                }
                return true;
            },
            onSuccess() {
                enqueueSnackbar("File berhasil dipindah!", { variant: "success" });
                refresh();
            },
        })
    }),

    async action({ file }) {
        return new Promise(async (resolve, reject) => {

            try {

                const picked = await this.drive.openFolderPicker("Pindah ke...");
                await this.move.send({
                    body: {
                        targetId: picked?.id || null,
                        sourceId: file.id
                    },
                    queryParams: {
                        act: "move"
                    }
                });
                resolve();

            } catch (e) {
                reject();
            }
        })
    },
})
