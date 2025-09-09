'use server'

import { getConnection } from "@/data-source";
import User from "@/entities/User";
import { putPublicObjectFromBuffer } from "@/libs/s3-storage";
import { currentTime, generateKey } from "@/libs/utils";
import sharp from "sharp";
import bcrypt from "bcrypt";
import { requestContext } from "@/libs/requestContext";
import { getCurrentToken, getUserByToken } from "./current-session";


export const getUser = async ({ uid }: any) => {
    try {

        const source = await getConnection();
        const userRepository = source.getRepository(User);
        const user = await userRepository.findOneBy({ id: uid });

        return {
            status: true,
            data: {
                user: JSON.parse(JSON.stringify(user))
            }
        }
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        }
    }
}



export const getAllUser = async () => {

    try {

        const source = await getConnection();
        const userRepository = source.getRepository(User);
        const users = await userRepository.createQueryBuilder('u')
            .getMany();

        return {
            status: true,
            data: {
                users: JSON.parse(JSON.stringify(users))
            }
        }
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        }
    }
}


export const handleAddUser = async ({ name, email, role, avatar }: any) => {

    try {

        const toke = await getCurrentToken();
        const user = await getUserByToken(toke);

        requestContext.run({ user }, async () => {

            const source = await getConnection();
            const userRepository = source.getRepository(User);
            const exist = await userRepository.findOneBy({ email });
            if (exist) throw new Error("400: Alamat email telah digunakan!");

            const uid = generateKey(12);
            const user = userRepository.create({
                id: uid,
                name,
                email,
                password: "",
                meta: {
                    role,
                    regToken: generateKey()
                }
            });


            if (avatar instanceof File) {
                const arrayBuffer = await avatar.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                try {

                    const image = sharp(buffer);
                    const metadata = await image.metadata();
                    if (metadata.width !== 100 || metadata.height !== 100) {
                        return {
                            status: false,
                            message: "Dimensi gambar harus 100x100 piksel"
                        }
                    }
                    const key = `avatars/${user.id}`;
                    user.meta.avatar = (await putPublicObjectFromBuffer(buffer, key, avatar.type)) + "?v=" + currentTime();

                } catch {
                    return {
                        status: false,
                        message: "Gagal membaca gambar. File mungkin rusak atau tidak valid."
                    };
                }
            }

            await userRepository.save(user);

            return {
                status: true,
                message: "Pengguna ditambahkan!"
            }
        })

    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        }
    }

}




