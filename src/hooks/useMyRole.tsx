import { useCurrentSession } from "@/components/context/CurrentSessionProvider";
import Role from "@/entities/Role";
import { getOne } from "@/libs/websocket/query";
import { useEffect, useMemo, useState } from "react"
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { SYSTEM_ROLES } from "@/permission";
import { merge } from "lodash";

const useMyRole = () => {

    const session = useCurrentSession();
    const user = useMemo(() => session.user, [session]);
    const [role, setRole] = useState<Role | null>(null);

    useEffect(() => {
        
        if (!user || !user.meta.role) return;
        const roleId = user.meta.role;

        const systemRole = SYSTEM_ROLES.find(e => e.id == roleId) || null;
        if (systemRole) setRole(systemRole);

        const query = getOne("role").where("id", "==", roleId)
        return onSnapshot(query, (data) => {
            setRole(merge({}, systemRole || {}, data));
        });
    }, [user]);

    return role;
}

export default useMyRole;