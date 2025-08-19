import { RotateCcw } from "lucide-react";
import { createContextMenu } from "../ContextMenuItem";
import { alpha } from "@mui/material";
import { getColor } from "@/theme/colors";

export default createContextMenu({
    style: {
        background: alpha(getColor('info')[500], 0.1),
        "&:hover": {
            background: alpha(getColor('info')[500], 0.4),
        }
    },
    label: "Pulihkan",
    icon: RotateCcw,


})