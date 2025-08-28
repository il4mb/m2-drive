'use server'

import { getSource } from "@/data-source"
import { Options } from "@/entity/Options";
import { withAction } from "@/libs/withApi"

export type UploadUnit = "kb" | "mb" | "gb";
export type MaxUploadOption = {
    roleName: string;
    size: number;
    unit: UploadUnit;
}

function parseOptionValue(val: string) {
    const cleaned = val.trim().toLowerCase();

    if (cleaned === 'unlimited') {
        return { size: Infinity, unit: 'mb' as UploadUnit }; // or use null for size
    }

    const match = cleaned.match(/^(\d+)(kb|mb|gb)$/);
    return match
        ? { size: Number(match[1]), unit: match[2] as UploadUnit }
        : { size: 0, unit: 'mb' as UploadUnit };
}


function formatOption(o: Options) {
    const { size, unit } = parseOptionValue(o.value);
    return {
        roleName: o.id.replace(/^\@max-upload-/, ''),
        size,
        unit,
        unlimited: size === Infinity
    };
}


// Helper to get all max-upload related options
async function fetchMaxUploadOptions() {
    const source = await getSource();
    return source.getRepository(Options)
        .createQueryBuilder("o")
        .where("o.id LIKE :name", { name: `@max-upload-%` })
        .getMany();
}

export const getMaxUploadOptions = withAction<{}, MaxUploadOption[]>(async () => {
    const options = await fetchMaxUploadOptions();
    return {
        status: true,
        data: options.map(formatOption),
        message: 'Oke'
    }
});

export const addMaxUploadOptions = withAction<MaxUploadOption & { unlimited: boolean }>(async ({ roleName, size, unit, unlimited }) => {
    const source = await getSource();
    const optionRepository = source.getRepository(Options);

    const id = `@max-upload-${roleName}`;
    let option = await optionRepository.findOne({ where: { id } });

    if (option) {
        option.value = unlimited ? 'unlimited' : `${size}${unit}`;
    } else {
        option = optionRepository.create({ id, value: unlimited ? 'unlimited' : `${size}${unit}` });
    }

    await optionRepository.save(option);
    const updated = await fetchMaxUploadOptions();

    return {
        status: true,
        data: updated.map(formatOption),
        message: 'Oke'
    }
});
