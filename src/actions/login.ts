'use server'

import { getSource } from "@/data-source";
import Token from "@/entity/Token";
import User from "@/entity/User";
import { currentTime, generateKey } from "@/libs/utils";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

type LoginProps = {
    email: string;
    password: string;
}
export async function handleLoginAsync({ email, password }: LoginProps) {

    try {
        const source = await getSource();
        const userRepository = source.getRepository(User);
        const tokenRepository = source.getRepository(Token);
        const user = await userRepository.findOneBy({ email });
        if (!user) {
            return {
                status: false,
                message: "404: Pengguna tidak ditemukan!"
            }
        }
        const isPasswordValid = bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new Error("400: Kata sandi tidak valid!");
        const token = tokenRepository.create({
            id: generateKey(),
            uId: user.id,
            createdAt: currentTime(),
            expiredAt: currentTime('1d'),
        });
        await tokenRepository.delete({ uId: user.id });
        await tokenRepository.save(token);
        return {
            status: true,
            message: "Token dibuat",
            data: {
                tokenId: token.id
            }
        }
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        }
    }
}


export async function handleStartSession({ tokenId }: any) {
   
    try {
        const source = await getSource();
        const tokenRepository = source.getRepository(Token);
        const exist = await tokenRepository.existsBy({ id: tokenId });
        if (!exist) throw new Error("404: Tidak ditemukan token");
        const cookiesJar = await cookies();
        cookiesJar.set("token-id", tokenId);
        return {
            status: true,
            message: "Masuk berhasil"
        }
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        }
    }
}