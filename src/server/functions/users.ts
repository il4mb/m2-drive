'use server'

import { getConnection } from "@/data-source";
import User from "@/entities/User";
import { createFunction, writeActivity } from "../funcHelper";
import { getRequestContext } from "@/libs/requestContext";
import { currentTime, generateKey } from "@/libs/utils";
import { checkPermission, checkPermissionSilent } from "../checkPermission";
import { isEmailValid } from "@/libs/validator";
import bcrypt from "bcrypt";


type AddUserProps = {
    name: string;
    email: string;
    role: string;
    password?: string;
}
export const addUser = createFunction(async ({ name, email, role, password }: AddUserProps) => {


    const canManage = checkPermissionSilent("can-manage-users");
    if (!canManage) {
        await checkPermission("can-add-user");
    }
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


    if (password) {
        if (password.length < 8) {
            throw new Error("Failed: Kata sandi harus minimal 8 karakter atau lebih!");
        }
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
    }

    await userRepository.save(user);
    return user;
})




export type UserUpdatePart = Partial<Omit<User, 'meta'>> & {
    meta: Partial<User['meta']>;
}
type UpdateUser = {
    userId: string;
    name: string;
    email: string;
    role?: string;
    avatar: string | null;
    password?: string;
}
export const updateUser = createFunction(
    async ({ userId, name, email, role, avatar, password }: UpdateUser) => {

        const { user: actor } = getRequestContext();

        const source = await getConnection();
        const usersRepository = source.getRepository(User);

        const canManage = checkPermissionSilent("can-manage-users");
        const isUpdateProfile = actor != "system" && userId == actor?.id;
        if (!canManage) {
            if (actor != "system") {
                if (!isUpdateProfile) {
                    await checkPermission("can-edit-user");
                } else if (userId == actor.id) {
                    await checkPermission("can-edit-profile");
                }
            }
        }

        const user = await usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new Error("Failed: User tidak ditemukan!");
        }

        const isHim = typeof actor == "object" && actor?.id == user.id;

        // Cek email unik (hanya jika email diubah)
        if (email && email !== user.email) {
            if (!isEmailValid(email)) {
                throw new Error("Failed: Alamat email tidak valid!");
            }
            const exist = await usersRepository.findOneBy({ email });
            if (exist) throw new Error("Failed: Alamat email telah digunakan!");

            if (user.email == "durianbohong@gmail.com") {
                throw new Error("Failed: Kamu bersyanda ya? 🤙🤪🫳");
            }
            user.email = email;
        }

        if (user.email == "durianbohong@gmail.com") {
            throw new Error("Failed: Kamu bersyanda ya? 🤙🤪🫳");
        }

        if (!user.createdAt) {
            user.createdAt = currentTime("-1d");
        }

        if (name) user.name = name;
        if (role) {
            if(isUpdateProfile) {
                throw new Error("Invalid props role in update profile!");
            }
            user.meta = {
                ...user.meta,
                role
            };
        }

        if (avatar) {
            user.meta.avatar = avatar;
        }

        if (password) {
            if (password.length < 8) {
                throw new Error("Failed: Kata sandi harus minimal 8 karakter atau lebih!");
            }
            const isPwSame = await bcrypt.compare(password, user.password);
            if (isPwSame) {
                throw new Error("Failed: Kata sandi tidak boleh sama dengan sebelumnya!");
            }

            const hashed = await bcrypt.hash(password, 10);
            user.password = hashed;
            if (user.meta.regToken) {
                delete user.meta.regToken;
            }
        }

        user.updatedAt = currentTime();
        await usersRepository.save(user);

        if (isHim) {
            writeActivity("EDIT_USER", `Memperbarui profile`);
        } else {
            writeActivity("EDIT_USER", `Memperbarui pengguna ${user.name}`);
        }
    }
)




export const deleteUser = createFunction(async ({ userId }: { userId: string }) => {

    if (!userId) throw new Error("400: User ID diperlukan!");
    const canManage = checkPermissionSilent("can-manage-users");
    if (!canManage) {
        await checkPermission("can-delete-user");
    }

    const source = await getConnection();
    const userRepository = source.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });
    if (!user) {
        throw new Error("404: Pengguna tidak ditemukan!");
    }
    if (user.email == "durianbohong@gmail.com") {
        throw new Error("400: Kamu bersyanda ya? 🤙🤪🫳");
    }

    await userRepository.delete({ id: user.id });
})