import { FolderOpen } from "lucide-react";
import { createContextMenu } from "../ContextMenuItem";
import { FileContextMenu } from "../drive/FileItem";

export default createContextMenu<FileContextMenu>({
    icon: FolderOpen,
    label: "Buka",
    action({ onOpen, file }) {
        onOpen?.(file);
    },
});