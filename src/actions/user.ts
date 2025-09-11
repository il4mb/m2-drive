'use server'

import { getConnection } from "@/data-source";
import User from "@/entities/User";
import { putPublicObjectFromBuffer } from "@/libs/s3-storage";
import { currentTime } from "@/libs/utils";
import sharp from "sharp";
import { getCurrentToken, getUserByToken } from "./current-session";
import { requestContext } from "@/libs/requestContext";
import { checkPermission } from "@/server/checkPermission";

export const uploadAvatar = async (userId: string, file: File) => {
    if (!userId) throw new Error("Failed Upload Avatar: User ID diperlukan!");

    const toke = await getCurrentToken();
    const actor = await getUserByToken(toke);

    return await requestContext.run({ user: actor }, async () => {

        if (actor.meta.role != "admin" && actor.id != userId) {
            await checkPermission("can-edit-user");
        } else {
            await checkPermission("can-edit-profile");
        }

        const source = await getConnection();
        const userRepository = source.getRepository(User);

        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("Failed Upload Avatar: Pengguna tidak ditemukan!");

        if (!file) {
            return {
                status: false,
                message: "Failed Upload Avatar: File is missing!"
            }
        }
        if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            try {

                const image = sharp(buffer);
                const metadata = await image.metadata();

                if (metadata.width !== 100 || metadata.height !== 100) {
                    return {
                        status: false,
                        message: "Failed Upload Avatar: Dimensi gambar harus 100x100 piksel"
                    };
                }

                const key = `avatars/${user.id}`;
                return {
                    status: true,
                    message: "Ok",
                    data: {
                        avatar: (await putPublicObjectFromBuffer(buffer, key, file.type)) + "?v=" + currentTime() as string
                    }
                }

            } catch {
                return {
                    status: false,
                    message: "Gagal membaca gambar. File mungkin rusak atau tidak valid."
                };
            }
        }
    })
}