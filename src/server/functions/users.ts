'use server'

import { getConnection } from "@/data-source";
import User from "@/entity/User";
import { createFunction } from "../funcHelper";

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