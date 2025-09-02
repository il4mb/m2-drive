import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { ChevronRight, Flag, Folder } from "lucide-react";
import TransferList, { TransferListItem } from "@/app/(dash)/settings/ui/TransferList";
import { useEffect, useMemo, useState } from "react";
import { File } from "@/entity/File";
import { useFileUpdate } from "@/hooks/useFileUpdate";
import { isEqual } from "lodash";
import { FileIcon } from "@untitledui/file-icons";


const FLAG_LIST: TransferListItem[] = [
    {
        label: "No Append",
        value: "no-append"
    },
    {
        label: "No Edit",
        value: 'no-edit'
    },
    {
        label: "No Remove",
        value: 'no-remove',
        parent: 'no-edit'
    },
    {
        label: "No Share",
        value: "no-share"
    }
]

export default createContextMenu<{ file: File }>({
    icon: Flag,
    label: "Sunting Label",
    component({ state, resolve }) {

        const { file } = state;
        const flagList = useMemo(() => file.type == "file"
            ? FLAG_LIST.filter(e => e.value != "no-append")
            : FLAG_LIST, [file]);

        const { update, loading, error } = useFileUpdate(file.id);
        const [tags, setTags] = useState<string[]>([]);
        const isValid = !isEqual(file.meta?.tags || [], tags);

        const handleSubmit = async () => {
            await update({ meta: { tags } })
        }

        useEffect(() => {
            setTags(file.meta?.tags || []);
        }, [file]);

        return (
            <Dialog maxWidth={"md"} fullWidth open>
                <DialogTitle>Manage Label</DialogTitle>
                <DialogContent>

                    {error && (
                        <Alert sx={{ mb: 2 }} severity={"error"}>
                            <AlertTitle>Failed</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    <Stack spacing={1} direction={"row"} alignItems={"center"} py={2}>
                        <ChevronRight />
                        <Stack spacing={1} direction={"row"} alignItems={"center"}>
                            {file.type == "folder" 
                            ? <Folder /> : <FileIcon variant="solid" 
                            // @ts-ignore
                            type={file.meta.mimeType} />}
                            <Typography fontSize={18}>{file.name}</Typography>
                        </Stack>
                    </Stack>

                    <TransferList
                        maxHeight={400}
                        defineList={flagList}
                        items={tags}
                        onChange={setTags}
                    />

                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={loading}
                        size="small"
                        color="inherit"
                        onClick={() => resolve(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={!isValid || loading}
                        loading={loading}
                        onClick={handleSubmit}>
                        Simpan
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
})