import Role from "@/entity/Role";
import { useEffect, useState } from "react";
import { SYSTEM_ROLES } from "@/permission";
import _ from "lodash";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { getMany } from "@/libs/websocket/query";


function mergeRolesDeep(rolesA: any[], rolesB: any[]) {
    const keyedA = _.keyBy(rolesA, "name");
    const keyedB = _.keyBy(rolesB, "name");
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