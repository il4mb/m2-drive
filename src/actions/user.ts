'use server'

import { getSource } from "@/data-source";
import User from "@/entity/User";
import { withAction } from "@/libs/withApi";

export const getUser = withAction<{ uId: string }, User>(async ({ uId }) => {

    const source = await getSource();
    const usersRepository = source.getRepository(User);
    const u = await usersRepository.findOneBy({ id: uId });
    if (!u) throw new Error("404: ");

    const user = JSON.parse(
        JSON.stringify(u)
    );

    return {
        status: true,
        message: "Ok",
        data: user
    }
})


export const findUsers = withAction<{ keyword: string }, User[]>(async ({ keyword }) => {

    const source = await getSource();
    const usersRepository = source.getRepository(User);
    const users = await usersRepository.createQueryBuilder("u")
        .where("u.name LIKE :keyword", { keyword: `%${keyword}%` })
        .orWhere("u.email LIKE :keyword", { keyword: `%${keyword}%` })
        .getMany();

    const data = JSON.parse(
        JSON.stringify(users)
    );

    return {
        status: true,
        message: "Ok",
        data
    }
})