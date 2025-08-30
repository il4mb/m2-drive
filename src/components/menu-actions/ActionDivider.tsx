import { Divider } from "@mui/material";
import { createContextMenu } from "../context-menu/ContextMenuItem";

export default createContextMenu({
    label: () => <Divider />
})