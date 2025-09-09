'use server'

import { getConnection } from "@/data-source";
import { createFunction } from "../funcHelper";
import { Options } from "@/entities/Options";
import { getRequestContext } from "@/libs/requestContext";
import { checkPermission } from "../checkPermission";

type OptionProps = {
    id: string;
    value: string;
};

export const saveOption = createFunction(async ({ id, value }: OptionProps) => {
    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-change-system-settings");

    const connection = await getConnection();
    const optionRepository = connection.getRepository(Options);

    await optionRepository.upsert(
        { id, value },
        ["id"] 
    );
});

export const deleteOption = createFunction(async ({ id }: { id: string }) => {
    const { user: actor } = getRequestContext();
    await checkPermission(actor, "can-change-system-settings");

    const connection = await getConnection();
    const optionRepository = connection.getRepository(Options);

    await optionRepository.delete({ id });
});
