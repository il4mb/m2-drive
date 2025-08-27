'use server'

import { getSource } from "@/data-source";
import Role from "@/entity/Role";
import { currentTime } from "@/libs/utils";
import z from "zod";

type AddRoleProps = {
    label: string;
    name: string;
    abilities: string[];
}

const AddRoleSchema = z.object({
    label: z.string().trim().min(3, "Label terlalu pendek").max(50, "Label terlalu panjang"),
    name: z.string().trim().min(3, "Name terlalu pendek").max(50, "Name terlalu panjang"),
    abilities: z.array(z.string()).default([])
});

export const addRole = async (rawData: AddRoleProps) => {

    try {

        if (rawData.name == "admin") {
            throw new Error("400: Tidak dapat membuat role dengan nama sama dengan \"admin\".")
        }

        // Validate and sanitize input
        const parsed = AddRoleSchema.parse({
            ...rawData,
            // normalize name to lowercase safe string
            name: rawData.name.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
            label: rawData.label.trim()
        });

        const source = await getSource();
        const repo = source.getRepository(Role);

        // Check if role already exists
        const exist = await repo.existsBy({ name: parsed.name });
        if (exist) {
            throw new Error(`400: Role dengan name "${parsed.name}" sudah ada!`);
        }

        // (Optional) also check label duplication
        const labelExist = await repo.existsBy({ label: parsed.label });
        if (labelExist) {
            throw new Error(`400: Role dengan label "${parsed.label}" sudah ada!`);
        }

        // Create new role
        const role = repo.create({
            label: parsed.label,
            name: parsed.name,
            abilities: parsed.abilities,
            createdAt: currentTime()
        });

        await repo.save(role);

        return {
            status: true,
            message: "Role berhasil ditambahkan",
            data: JSON.parse(JSON.stringify(role))
        };

    } catch (e: any) {
        // Zod error
        if (e instanceof z.ZodError) {
            return {
                status: false,
                ...e
            }
        }

        // Other error
        return {
            status: false,
            message: e.message || "Terjadi kesalahan tidak diketahui"
        }
    }
};


export const getAllRole = async () => {
    try {
        const source = await getSource();
        const repo = source.getRepository(Role);

        const roles = await repo.find({
            order: { createdAt: "DESC" }
        });

        return {
            status: true,
            message: "",
            data: JSON.parse(JSON.stringify(roles))
        };
    } catch (e: any) {
        return {
            status: false,
            message: e.message || "Gagal mengambil data role",
            data: []
        };
    }
}