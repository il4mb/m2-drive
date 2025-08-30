import Role from "@/entity/Role";
import { useEffect, useState } from "react";
import useRequest from "./useRequest";
import { getAllRole } from "@/actions/manage-role";
import { SYSTEM_ROLES } from "@/permission";
import _ from "lodash";
import { useOnEmit } from "@/socket";


function mergeRolesDeep(rolesA: any[], rolesB: any[]) {
    const keyedA = _.keyBy(rolesA, "name");
    const keyedB = _.keyBy(rolesB, "name");
    const merged = _.merge({}, keyedA, keyedB);
    return _.values(merged);
}


export default function useRoles() {

    const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
    const request = useRequest({
        action: getAllRole,
        onSuccess(result) {
            setRoles(mergeRolesDeep(SYSTEM_ROLES, result.data));
        },
    });

    useOnEmit("update", {
        collection: "role",
        callback(data) {
            request.send();
        },
    })

    useEffect(() => {
        request.send();
    }, []);

    return roles;
}