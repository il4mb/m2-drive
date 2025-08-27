'use server'

import { getSource } from "@/data-source";
import User from "@/entity/User";
import { generateKey } from "@/libs/utils";


export const getUser = async ({ uId }: any) => {
    try {

        const source = await getSource();
        const userRepository = source.getRepository(User);
        const user = await userRepository.findOneBy({ id: uId });

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


export const handleAddUser = async ({ name, email, role }: any) => {

    try {

        const source = await getSource();
        const userRepository = source.getRepository(User);
        const exist = await userRepository.findOneBy({ email });
        if (exist) throw new Error("400: Alamat email telah digunakan!");

        const user = userRepository.create({
            name, email,
            password: "",
            meta: {
                role,
                regToken: generateKey()
            }
        });

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