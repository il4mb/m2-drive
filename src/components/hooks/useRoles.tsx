import Role from "@/entity/Role";
import { useEffect, useState } from "react";
import useRequest from "./useRequest";
import { getAllRole } from "@/actions/manage-role";
import { SYSTEM_ROLES } from "@/permission";

export default function useRoles() {
    
    const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
    const request = useRequest({
        action: getAllRole,
        onSuccess(result) {
            setRoles([...result.data, ...SYSTEM_ROLES]);
        },
    });

    useEffect(() => {
        request.send();
    }, []);

    return roles;
}