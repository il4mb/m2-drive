'use server'

import { getConnection } from "@/data-source";
import { createFunction, writeActivity } from "../funcHelper";
import { Options } from "@/entities/Options";
import { checkPermission } from "../checkPermission";

type OptionProps = {
    id: string;
    value: string;
};

export const saveOption = createFunction(async ({ id, value }: OptionProps) => {

    await checkPermission("can-change-system-settings");
    const connection = await getConnection();
    const optionRepository = connection.getRepository(Options);

    await optionRepository.upsert(
        { id, value },
        ["id"]
    );

    writeActivity("CHANGE_SETTING", "Memperbarui pengaturan sistem", { id });
});

export const deleteOption = createFunction(async ({ id }: { id: string }) => {

    await checkPermission("can-change-system-settings");
    const connection = await getConnection();
    const optionRepository = connection.getRepository(Options);

    await optionRepository.delete({ id });
    writeActivity("CHANGE_SETTING", "Memperbarui pengaturan sistem", { id });
});
