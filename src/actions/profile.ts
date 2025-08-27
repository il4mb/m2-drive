'use server'

import { getSource } from "@/data-source";
import Token from "@/entity/Token";
import User from "@/entity/User";
import { currentTime } from "@/libs/utils";
import { cookies } from "next/headers";

export const getCurrentUser = async () => {
    const tokenId = (await cookies()).get("token-id")?.value;
    if (!tokenId) throw new Error("401: Missing authentication token.");

    const source = await getSource();
    const tokenRepository = source.getRepository(Token);
    const userRepository = source.getRepository(User);

    const token = await tokenRepository.findOneBy({ id: tokenId });
    if (!token) throw new Error("401: Invalid token.");

    const now = currentTime();
    if (now >= token.expiredAt) {
        throw new Error("401: Token expired");
    }

    const user = await userRepository.findOneBy({ id: token.uid });
    if (!user) throw new Error("404: User not found.");

    return user;
};

export const getProfile = async () => {
    try {
        const user = await getCurrentUser();
        return {
            status: true,
            message: "",
            data: JSON.parse(JSON.stringify(user))
        };
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        };
    }
};
