'use server'

import { getSource } from "@/data-source";
import Role from "@/entity/Role";
import { currentTime } from "@/libs/utils";
import { withAction } from "@/libs/withApi";
import { SYSTEM_ROLES } from "@/permission";
import z from "zod";

type SaveRoleProps = {
    name: string;
    label: string;
    abilities: string[];
};

const SaveRoleSchema = z.object({
    name: z.string().trim().min(3, "Name terlalu pendek").max(50, "Name terlalu panjang"),
    label: z.string().trim().min(3, "Label terlalu pendek").max(50, "Label terlalu panjang"),
    abilities: z.array(z.string()).default([])
});

export const saveRole = withAction<SaveRoleProps, Role>(async (data) => {

    if (data.name === "admin") {
        throw new Error(`400: Tidak dapat membuat atau memperbarui role dengan nama "admin".`);
    }

    const parsed = SaveRoleSchema.parse({
        ...data,
        name: data.name.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        label: data.label.trim()
    });

    const source = await getSource();
    const repo = source.getRepository(Role);

    let role = await repo.findOneBy({ name: parsed.name });

    if (!role) {
        // CREATE new role
        if (await repo.existsBy({ label: parsed.label })) {
            throw new Error(`400: Role dengan label "${parsed.label}" sudah ada!`);
        }
        if (SYSTEM_ROLES.some(e => e.name == parsed.name)) {
            throw new Error(`400: Role dengan name "${parsed.name}" sama dengan role sistem!`);
        }

        role = repo.create({
            name: parsed.name,
            label: parsed.label,
            abilities: parsed.abilities,
            createdAt: currentTime()
        });

        await repo.save(role);

        return {
            status: true,
            message: "Role berhasil ditambahkan",
            data: JSON.parse(JSON.stringify(role))
        };
    } else {
        // UPDATE existing role
        if (role.label !== parsed.label && await repo.existsBy({ label: parsed.label })) {
            throw new Error(`400: Role dengan label "${parsed.label}" sudah ada!`);
        }

        role.label = parsed.label;
        role.abilities = parsed.abilities;

        await repo.save(role);

        return {
            status: true,
            message: "Role berhasil diperbarui",
            data: JSON.parse(JSON.stringify(role))
        };
    }
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
