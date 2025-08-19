import { Pen } from "lucide-react";
import { createContextMenu } from "../ContextMenuItem";
import { FileContextMenu } from "../drive/FileItem";
import { Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";

export default createContextMenu<FileContextMenu>({
    icon: Pen,
    label: "Sunting",
    async action(payload) {

        return new Promise(() => {
            
        });
    },
    component: ({ payload, resolve }) => {

        const [name, setName] = useState('');

        const handleName = (e: ChangeEvent<HTMLInputElement>) => {
            const newName = e.target.value;
            if (newName.length > 34) return;
            setName(newName);
        }
        
        useEffect(() => {
            setName(payload.file.name || "");
        }, [payload.file]);

        return (
            <Dialog maxWidth="md" onClose={() => resolve()} fullWidth open>
                <DialogTitle>Sunting File</DialogTitle>
                <DialogContent>
                    <TextField
                        value={name}
                        onChange={handleName}
                        fullWidth />
                </DialogContent>
            </Dialog>
        )
    }
})