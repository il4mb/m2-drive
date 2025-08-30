import { FolderOpen } from "lucide-react";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { File } from "@/entity/File";

type State = {
    file: File;
    onOpen?: (f: File) => void;
}
export default createContextMenu<State>({
    icon: FolderOpen,
    label: "Buka",
    action({ onOpen, file }) {
        onOpen?.(file);
    },
});