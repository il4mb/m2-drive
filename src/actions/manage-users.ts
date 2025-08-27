'use server'

import { getSource } from "@/data-source";
import User from "@/entity/User";
import { putPublicObjectFromBuffer } from "@/libs/s3-storage";
import { currentTime, generateKey } from "@/libs/utils";
import sharp from "sharp";
import bcrypt from "bcrypt";


export const getUser = async ({ uid }: any) => {
    try {

        const source = await getSource();
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

        const source = await getSource();
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

        const source = await getSource();
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
export const handleUpdateUser = async ({ uid, name, email, role, avatar, password }: UpdateUser) => {

    try {

        if (!uid) throw new Error("400: User ID diperlukan!");

        const source = await getSource();
        const userRepository = source.getRepository(User);

        const user = await userRepository.findOneBy({ id: uid });
        if (!user) throw new Error("404: Pengguna tidak ditemukan!");

        // Cek email unik (hanya jika email diubah)
        if (email && email !== user.email) {
            const exist = await userRepository.findOneBy({ email });
            if (exist) throw new Error("400: Alamat email telah digunakan!");
            user.email = email;
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

        user.updatedAt = currentTime();
        await userRepository.save(user);

        return {
            status: true,
            message: "Pengguna berhasil diperbarui!",

        };
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Unknown Error"
        };
    }
};
