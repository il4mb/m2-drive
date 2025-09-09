import Role from "@/entities/Role";
import { useEffect, useState } from "react";
import { SYSTEM_ROLES } from "@/permission";
import _ from "lodash";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { getMany } from "@/libs/websocket/query";


function mergeRolesDeep(rolesA: any[], rolesB: any[]) {
    const keyedA = _.keyBy(rolesA, "id");
    const keyedB = _.keyBy(rolesB, "id");
    const merged = _.merge({}, keyedA, keyedB);
    return _.values(merged);
}


export default function useRoles() {

    const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
    useEffect(() => {
        return onSnapshot(getMany("role"), (roles) => {
            setRoles(mergeRolesDeep(roles, SYSTEM_ROLES));
        })
    }, []);

    return roles;
}