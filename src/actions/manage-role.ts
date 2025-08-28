'use server'

import { getSource } from "@/data-source";
import Role from "@/entity/Role";
import { currentTime } from "@/libs/utils";
import { withAction } from "@/libs/withApi";
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

export const addRole = withAction<AddRoleProps, Role>(async (data) => {
    if (data.name == "admin") {
        throw new Error(`400: Tidak dapat membuat role dengan nama "admin".`);
    }

    const parsed = AddRoleSchema.parse({
        ...data,
        name: data.name.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        label: data.label.trim()
    });

    const source = await getSource();
    const repo = source.getRepository(Role);

    if (await repo.existsBy({ name: parsed.name })) {
        throw new Error(`400: Role dengan name "${parsed.name}" sudah ada!`);
    }
    if (await repo.existsBy({ label: parsed.label })) {
        throw new Error(`400: Role dengan label "${parsed.label}" sudah ada!`);
    }

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
});


// ---------------- UPDATE ----------------
type UpdateRoleProps = {
    name: string;
    label: string;
    abilities: string[];
};

const UpdateRoleSchema = z.object({
    name: z.string().trim().min(3),
    label: z.string().trim().min(3).max(50),
    abilities: z.array(z.string())
});

export const updateRole = withAction<UpdateRoleProps, Role>(async (data) => {
    const parsed = UpdateRoleSchema.parse(data);

    const source = await getSource();
    const repo = source.getRepository(Role);

    const role = await repo.findOneBy({ name: parsed.name });
    if (!role) {
        throw new Error(`404: Role dengan name "${parsed.name}" tidak ditemukan.`);
    }

    role.label = parsed.label.trim();
    role.abilities = parsed.abilities;

    await repo.save(role);

    return {
        status: true,
        message: "Role berhasil diperbarui",
        data: JSON.parse(JSON.stringify(role))
    };
});


// ---------------- DELETE ----------------
export const deleteRole = withAction<{ name: string }, null>(async ({ name }) => {
    const source = await getSource();
    const repo = source.getRepository(Role);

    const role = await repo.findOneBy({ name });
    if (!role) {
        throw new Error(`404: Role dengan name "${name}" tidak ditemukan.`);
    }

    await repo.remove(role);

    return {
        status: true,
        message: "Role berhasil dihapus",
        data: null
    };
});


// ---------------- GET ALL ----------------
export const getAllRole = withAction(async () => {
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
});
