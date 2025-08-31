import { getConnection } from "@/data-source";
import Token from "@/entity/Token";
import User from "@/entity/User";
import { currentTime } from "@/libs/utils";



export const getTokenById = async (tokenId: string) => {

    const tokenRepository = (await getConnection()).getRepository(Token);
    const token = await tokenRepository.findOneBy({ id: tokenId });
    if (!token) throw new Error("401: Invalid token.");
    return token;
}

export const getUserByToken = async (token: Token) => {

    const source = await getConnection();
    const userRepository = source.getRepository(User);
    const now = currentTime();
    if (now >= token.expiredAt) {
        throw new Error("401: Token expired");
    }

    const user = await userRepository.findOneBy({ id: token.uid });
    if (!user) throw new Error("404: User not found.");

    return user;
}

