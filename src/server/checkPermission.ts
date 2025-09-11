import { getConnection } from "@/data-source";
import Role from "@/entities/Role";
import { getRequestContext } from "@/libs/requestContext";
import { PERMISSION_NAMES } from "@/permission";

export const checkPermission = async (permission: PERMISSION_NAMES | PERMISSION_NAMES[]): Promise<boolean> => {

    const { user } = getRequestContext();
    if (!user) throw new Error("Failed validate permission: Authentification required!");
    if (user == "system") return true;

    const connection = await getConnection();
    const roleRepository = connection.getRepository(Role);
    const roleId = user.meta?.role;
    if (!roleId) throw new Error("Failed validate permission: Member role doesn't exist!");

    if (roleId == "admin") return true;

    const role = await roleRepository.findOneBy({ id: roleId });
    if (!role) throw new Error("Failed validate permission: Role not found!");

    const abilities = role.abilities || [];
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    // Check if all required permissions are granted
    const hasAllPermissions = requiredPermissions.every(p => abilities.includes(p));
    if (!hasAllPermissions) {
        throw new Error("Failed validate permission: Insufficient permissions");
    }

    return true;
};


export const checkPermissionSilent = async (permission: PERMISSION_NAMES | PERMISSION_NAMES[]): Promise<boolean> => {
    try {
        return await checkPermission(permission);
    } catch (error: any) {
        return false;
    }
}
