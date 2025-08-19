'use client'

import { useDrive } from "@/components/context/DriveProvider";
import useRequest from "@/components/hooks/useRequest";
import { Copy } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { createContextMenu } from "../ContextMenuItem";
import { FileContextMenu } from "../drive/FileItem";

type State = {
    drive: ReturnType<typeof useDrive>,
    copy: ReturnType<typeof useRequest>
}

export default createContextMenu<FileContextMenu, State>({
    icon: Copy,
    label: "Salin ke...",

    state: ({ refresh, file }) => ({
        drive: useDrive(),
        copy: useRequest({
            endpoint: "/api/drive",
            method: "POST",
            onError(err) {
                enqueueSnackbar(err?.message || "Unknown Error", { variant: "error" });
            },
            onValidate({ body }) {
                if (!body) return false;
                if (body.fId === file.id) {
                    enqueueSnackbar("Tidak dapat menyalin ke folder yang sama!", { variant: 'warning' });
                    console.warn("Tidak dapat menyalin ke folder yang sama!");
                    return false;
                }
                if (body?.fId === file.pId) {
                    enqueueSnackbar("Tidak dapat menyalin ke folder asal!", { variant: 'warning' });
                    console.warn("Tidak dapat menyalin ke folder asal!");
                    return false;
                }
                return true;
            },
            onSuccess() {
                enqueueSnackbar("File berhasil disalin!", { variant: "success" });
                refresh();
            },
        })
    }),

    async action({ file }) {
        return new Promise(async (resolve, reject) => {
            
            try {

                const picked = await this.drive.openFolderPicker("Salin ke...");
                await this.copy.send({
                    body: {
                        targetId: picked?.id || null,
                        sourceId: file.id
                    },
                    queryParams: {
                        act: "copy"
                    }
                });
                resolve();

            } catch (e) {
                reject();
            }
        })
    },
})
