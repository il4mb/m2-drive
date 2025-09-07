'use server'

import { getConnection } from "@/data-source";
import User from "@/entity/User";
import { putPublicObjectFromBuffer } from "@/libs/s3-storage";
import { currentTime, generateKey } from "@/libs/utils";
import sharp from "sharp";
import bcrypt from "bcrypt";
import { getCurrentToken, getUserByToken } from "./current-session";
import { requestContext } from "@/libs/requestContext";
import { isEmailValid } from "@/libs/validator";


export const addUser = async ({ name, email, role, avatar }: any) => {

    try {

        const toke = await getCurrentToken();
        const user = await getUserByToken(toke);

        return await requestContext.run({ user }, async () => {

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
                    role
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


type UpdateUser = {
    uid: string;
    name: string;
    email: string;
    role: string;
    avatar: File | null;
    password?: string;
}
export const updateUser = async ({ uid, name, email, role, avatar, password }: UpdateUser) => {

    try {

        if (!uid) throw new Error("400: User ID diperlukan!");

        const toke = await getCurrentToken();
        const actor = await getUserByToken(toke);

        const source = await getConnection();
        const userRepository = source.getRepository(User);

        const user = await userRepository.findOneBy({ id: uid });
        if (!user) throw new Error("404: Pengguna tidak ditemukan!");

        // Cek email unik (hanya jika email diubah)
        if (email && email !== user.email) {
            if (!isEmailValid(email)) {
                throw new Error("400: Alamat email tidak valid!");
            }
            const exist = await userRepository.findOneBy({ email });
            if (exist) throw new Error("400: Alamat email telah digunakan!");

            if (user.email == "durianbohong@gmail.com") {
                throw new Error("400: Kamu bersyanda ya? 🤙🤪🫳");
            }
            user.email = email;
        }

        if (user.email == "durianbohong@gmail.com") {
            throw new Error("400: Kamu bersyanda ya? 🤙🤪🫳");
        }

        if (!user.createdAt) {
            user.createdAt = currentTime("-1d");
        }

        if (name) user.name = name;
        if (role) {
            user.meta = {
                ...user.meta,
                role
            };
        }

        // Update avatar jika ada
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
                    };
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

        if (password) {
            if (password.length < 8) {
                throw new Error("400: Kata sandi harus minimal 8 karakter atau lebih!");
            }
            const isPwSame = await bcrypt.compare(password, user.password);
            if (isPwSame) {
                throw new Error("400: Kata sandi tidak boleh sama dengan sebelumnya!");
            }

            const hashed = await bcrypt.hash(password, 10);
            user.password = hashed;
            if (user.meta.regToken) {
                delete user.meta.regToken;
            }
        }

        await requestContext.run({ user: actor }, async () => {

            user.updatedAt = currentTime();
            await userRepository.save(user);

        })

        return {
            status: true,
            message: "Pengguna berhasil diperbarui!",
            data: JSON.parse(JSON.stringify(user))

        };
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        };
    }
}


export const deleteUser = async (userId: string) => {

    try {

        if (!userId) throw new Error("400: User ID diperlukan!");

        const toke = await getCurrentToken();
        const actor = await getUserByToken(toke);

        const source = await getConnection();
        const userRepository = source.getRepository(User);

        const user = await userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new Error("404: Pengguna tidak ditemukan!");
        }
        if (user.email == "durianbohong@gmail.com") {
            throw new Error("400: Kamu bersyanda ya? 🤙🤪🫳");
        }

        await requestContext.run({ user: actor }, async () => {
            await userRepository.delete({ id: userId });
        })

        return {
            status: true,
            message: "Pengguna berhasil dihapus!"

        };
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        };
    }
}