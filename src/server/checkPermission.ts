import { getConnection } from "@/data-source";
import Role from "@/entity/Role";
import User from "@/entity/User";
import { PERMISSION_NAMES } from "@/permission";

export const checkPermission = async (userId: User | string | undefined | null, permission: PERMISSION_NAMES | PERMISSION_NAMES[]) => {

    if (!userId) throw new Error("Failed validate permission: Authentification required!");
    if (userId == "system") return true;

    const connection = await getConnection();
    const roleRepository = connection.getRepository(Role);
    const userRepository = connection.getRepository(User);

    // Ensure we have a User object
    const user = typeof userId === "object"
        ? userId
        : await userRepository.findOneBy({ id: userId });

    if (!user) throw new Error("Failed validate permission: User not found!");

    // Ensure user has a role assigned
    const roleId = user.meta?.role;
    if (!roleId) throw new Error("Failed validate permission: Member role doesn't exist!");

    if(roleId == "admin") return true;

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


export const checkPermissionSilent = async (userId: User | string | undefined | null, permission: PERMISSION_NAMES | PERMISSION_NAMES[]) => {
    try {

        return await checkPermission(userId, permission);

    } catch (error: any) {

        return false;
        
    }
}
