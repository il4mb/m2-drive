'use server'

import { getConnection } from "@/data-source";
import User from "@/entities/User";
import { createFunction, writeActivity } from "../funcHelper";
import { getRequestContext } from "@/libs/requestContext";
import { currentTime } from "@/libs/utils";
import { checkPermission } from "../checkPermission";

export const getUser = createFunction(async ({ uId }: { uId: string }) => {

    const source = await getConnection();
    const usersRepository = source.getRepository(User);
    const user = await usersRepository.findOneBy({ id: uId });
    if (!user) throw new Error("404: ");
    return user;
})


export const findUsers = createFunction(async ({ keyword }: { keyword: string }) => {

    const source = await getConnection();
    const usersRepository = source.getRepository(User);
    const users = await usersRepository.createQueryBuilder("u")
        .where("u.name LIKE :keyword", { keyword: `%${keyword}%` })
        .orWhere("u.email LIKE :keyword", { keyword: `%${keyword}%` })
        .getMany();

    return users;
})



export type UserUpdatePart = Partial<Omit<User, 'meta'>> & {
    meta: Partial<User['meta']>;
}
export type UpdateUserProps = {
    userId: string;
    data: UserUpdatePart
}
export const updateUser = createFunction(
    async ({ userId, data }: UpdateUserProps) => {

        const { user: actor } = getRequestContext();

        const source = await getConnection();
        const usersRepository = source.getRepository(User);
        if (actor != "system" && actor?.meta.role != "admin" && userId != actor?.id) {
            // Permission check
            await checkPermission(actor, "can-edit-user");
        }

        const user = await usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new Error("404: User tidak ditemukan!");
        }

        const isHim = typeof actor == "object" && actor?.id == user.id;

        const updatedData = { ...user, ...data }
        let updatedMeta = user.meta;
        if (data.meta) {
            updatedMeta = {
                ...updatedMeta,
                ...data.meta
            }
        }

        updatedData.meta = updatedMeta;
        updatedData.updatedAt = currentTime();
        await usersRepository.save(updatedData);

        if (isHim) {
            writeActivity("EDIT_USER", `Memperbarui profile`);
        } else {
            writeActivity("EDIT_USER", `Memperbarui pengguna ${user.name}`);
        }
    }
)