'use server'

import { getConnection } from "@/data-source";
import Role from "@/entities/Role";
import { currentTime } from "@/libs/utils";
import { SYSTEM_ROLES } from "@/permission";
import z from "zod";
import { createFunction, writeActivity } from "../funcHelper";
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission } from "../checkPermission";

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

export const saveRole = createFunction(async (data: SaveRoleProps) => {

    if (data.name === "admin") {
        throw new Error(`Failed Save Role: Tidak dapat membuat atau memperbarui role dengan nama "admin".`);
    }

    const { user: actor } = getRequestContext();
    // Permission check
    await checkPermission(actor, "can-manage-roles");

    const parsed = SaveRoleSchema.parse({
        ...data,
        name: data.name.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        label: data.label.trim()
    });

    const source = await getConnection();
    const repo = source.getRepository(Role);

    let role = await repo.findOneBy({ id: parsed.name });

    if (!role) {
        // CREATE new role
        if (await repo.existsBy({ label: parsed.label })) {
            throw new Error(`Failed Save Role: Role dengan label "${parsed.label}" sudah ada!`);
        }
        if (SYSTEM_ROLES.some(e => e.id == parsed.name)) {
            throw new Error(`Failed Save Role: Role dengan name "${parsed.name}" sama dengan role sistem!`);
        }

        role = repo.create({
            id: parsed.name,
            label: parsed.label,
            abilities: parsed.abilities,
            createdAt: currentTime()
        });

        await repo.save(role);

        writeActivity("ADD_ROLE", `Menambahkan role ${role.id}, ${role.abilities.length} ability`);
        return role;

    } else {
        // UPDATE existing role
        if (role.label !== parsed.label && await repo.existsBy({ label: parsed.label })) {
            throw new Error(`Failed Save Role: Role dengan label "${parsed.label}" sudah ada!`);
        }

        role.label = parsed.label;
        role.abilities = parsed.abilities;

        await repo.save(role);
        writeActivity("EDIT_ROLE", `Mengedit role ${role.id}, ${role.abilities.length} ability`);
        return role;
    }
});

export const deleteRole = createFunction(async ({ name }: { name: string }) => {

    if (name == "admin") throw new Error(`Failed Remove Role: Role admin tidak bisa dihapus.`);

    const { user: actor } = getRequestContext();
    // Permission check
    await checkPermission(actor, "can-manage-roles");

    const source = await getConnection();
    const repo = source.getRepository(Role);

    const role = await repo.findOneBy({ id: name });
    if (!role) {
        throw new Error(`Failed Remove Role: Role dengan name "${name}" tidak ditemukan.`);
    }

    await repo.remove(role);
    writeActivity("DELETE_ROLE", `Menghapus role ${role.id}`);

});
