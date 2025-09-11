import { PERMISSION_NAMES } from "@/permission";
import { useMemo } from "react";
import useMyRole from "./useMyRole";

export const useMyPermission = (permissions: PERMISSION_NAMES | PERMISSION_NAMES[]) => {
    
    const role = useMyRole();
    const abilities = useMemo(() => role?.abilities || [], [role])
    return (typeof permissions == "string" ? [permissions] : permissions).every(e => abilities.includes(e));
}