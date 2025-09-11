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
