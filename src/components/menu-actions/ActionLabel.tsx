import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { ChevronRight, Flag, Folder } from "lucide-react";
import TransferList, { TransferListItem } from "@/app/(dash)/settings/ui/TransferList";
import { useEffect, useMemo, useState } from "react";
import { File, FileTags } from "@/entities/File";
import { useFileUpdate } from "@/hooks/useFileUpdate";
import { isEqual } from "lodash";
import { FileIcon } from "@untitledui/file-icons";
import { useCurrentSession } from "../context/CurrentSessionProvider";


const FLAG_LIST: TransferListItem<FileTags>[] = [

    {
        label: "No Edit",
        value: 'no-edit'
    },
    {
        label: "No Append",
        value: "no-append",
        parent: 'no-edit'
    },
    {
        label: "No Remove",
        value: 'no-remove',
        parent: 'no-remove'
    },
    {
        label: 'No Clone',
        value: 'no-clone'
    },
    {
        label: "No Share",
        value: "no-share"
    }
]

export default createContextMenu<{ file: File }>({
    state() {
        return {
            session: useCurrentSession()
        }
    },
    show({ session }) {
        return Boolean(session?.user);
    },
    icon: Flag,
    label: "Sunting Tags",
    component({ state, resolve }) {

        const { file } = state;
        const flagList = useMemo(() => file.type == "file"
            ? FLAG_LIST.filter(e => e.value != "no-append")
            : FLAG_LIST, [file]);

        const { update, loading, error } = useFileUpdate(file.id);
        const [tags, setTags] = useState<FileTags[]>([]);
        const isValid = !isEqual(file.meta?.tags || [], tags);

        const handleSubmit = async () => {
            await update({ meta: { tags } })
        }

        useEffect(() => {
            setTags(file.meta?.tags || []);
        }, [file]);

        return (
            <Dialog maxWidth={"md"} onClose={() => resolve(false)} fullWidth open>
                <DialogTitle>Manage Tags</DialogTitle>
                <DialogContent>

                    {error && (
                        <Alert sx={{ mb: 2 }} severity={"error"}>
                            <AlertTitle>Failed</AlertTitle>
                            {error}
                        </Alert>
                    )}
                    <Stack spacing={1} direction={"row"} alignItems={"center"} py={2} mb={1}>
                        <ChevronRight />
                        <Stack spacing={1} direction={"row"} alignItems={"center"} borderBottom={'1px solid'}>
                            {file.type == "folder"
                                ? <Folder size={18} />
                                : <FileIcon
                                    size={18}
                                    variant="solid"
                                    // @ts-ignore
                                    type={file.meta.mimeType} />}
                            <Typography fontSize={16}>{file.name}</Typography>
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