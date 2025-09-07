import { Folder } from "lucide-react"
import { ViewerModule } from "../../viewer/ModuleViewerManager";
import { Stack, Typography } from "@mui/material";
import StickyHeader from "../StickyHeader";
import { File } from "@/entity/File";



export const FolderViewerComponent: React.FC<{ file?: File }> = ({}) => {

    return (
        <>
        
        </>
    )
}

export default {
    priority: 10,
    id: 'folder',
    name: "Folder",
    icon: <Folder size={18} />,
    supports: (_, file) => file.type == "folder",
    component: FolderViewerComponent
} as ViewerModule;