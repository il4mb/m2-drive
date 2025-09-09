'use server'

import { getConnection } from "@/data-source";
import Role from "@/entities/Role";
import Token from "@/entities/Token";
import User from "@/entities/User";
import { currentTime } from "@/libs/utils";
import { withAction } from "@/libs/withApi";
import { PERMISSION_LIST, TPermission } from "@/permission";
import { cookies } from "next/headers";

const getRepositories = async () => {
    const source = await getConnection();
    const tokenRepository = source.getRepository(Token);
    const userRepository = source.getRepository(User);
    const roleRepository = source.getRepository(Role);
    return { source, tokenRepository, userRepository, roleRepository };
}

export const getCurrentToken = async () => {

    const tokenId = (await cookies()).get("token-id")?.value;
    if (!tokenId) throw new Error("401: Missing authentication token.");
    const { tokenRepository } = await getRepositories();

    const token = await tokenRepository.findOneBy({ id: tokenId });
    if (!token) {
        const cookiesJar = await cookies();
        cookiesJar.delete("token-id");
        throw new Error("401: Invalid token.");
    }
    return token;
}

export const getUserByToken = async (token: Token) => {

    const { userRepository } = await getRepositories();
    const now = currentTime();
    if (now >= token.expiredAt) {
        throw new Error("401: Token expired");
    }

    const user = await userRepository.findOneBy({ id: token.uid });
    if (!user) throw new Error("404: User not found.");

    return user;
}



export const getCurrentSession = withAction<{}, { token: Token, userId: string }>(async () => {

    const token = await getCurrentToken();
    const { password, ...user } = await getUserByToken(token);
    const data = JSON.parse(
        JSON.stringify({
            token,
            userId: user.id
        })
    )
    return {
        status: true,
        message: "Berhasil ambil informasi sessi",
        data
    };
});


export const getCurrentUserAbilities = withAction<{}, { role: Role, permissions: TPermission[] }>(async () => {

    const { roleRepository } = await getRepositories();
    const token = await getCurrentToken();
    const { meta } = await getUserByToken(token);

    if (meta.role == "admin") {
        return {
            status: true,
            message: "Berhasil ambil informasi",
            data: {
                role: {
                    id: "admin",
                    label: "Admin",
                    abilities: PERMISSION_LIST.map(e => e.value),
                    createdAt: 0
                },
                permissions: PERMISSION_LIST
            }
        }
    }

    const role = await roleRepository.findOneBy({ id: meta.role });
    if (!role) throw new Error("404: Role tidak ditemukan!");

    const abilities: string[] = role.abilities;
    const permissions = PERMISSION_LIST.filter(e => abilities.includes(e.value));

    const data = JSON.parse(
        JSON.stringify({
            role,
            permissions
        })
    )

    return {
        status: true,
        message: "Berhasil ambil informasi",
        data
    };
});



