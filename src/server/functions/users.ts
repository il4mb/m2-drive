'use server'

import { getConnection } from "@/data-source";
import User from "@/entity/User";
import { createFunction } from "../funcHelper";
import { getRequestContext } from "@/libs/requestContext";
import { currentTime } from "@/libs/utils";

export const getUser = createFunction<{ uId: string }, User>(async ({ uId }) => {

    const source = await getConnection();
    const usersRepository = source.getRepository(User);
    const user = await usersRepository.findOneBy({ id: uId });
    if (!user) throw new Error("404: ");
    return user;
})


export const findUsers = createFunction<{ keyword: string }, User[]>(async ({ keyword }) => {

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
export const updateUser = createFunction<UpdateUserProps>(
    async ({ userId, data }) => {

        const { user: actor } = getRequestContext();
        const source = await getConnection();
        const usersRepository = source.getRepository(User);
        if (actor != "system" && actor?.meta.role != "admin" && userId != actor?.id) {
            throw new Error("403: No Permission to update this user!");
        }

        const user = await usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new Error("404: User tidak ditemukan!");
        }

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
    }
)