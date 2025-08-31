'use server'

import { getConnection } from "@/data-source"
import { Options } from "@/entity/Options";
import { withAction } from "@/libs/withApi"

export type SizeUnit = "kb" | "mb" | "gb";
export type DriveSizeOption = {
    roleName: string;
    size: number;
    unit: SizeUnit;
}

function parseOptionValue(val: string) {
    const cleaned = val.trim().toLowerCase();

    if (cleaned === 'unlimited') {
        return { size: Infinity, unit: 'mb' as SizeUnit }; // or use null for size
    }

    const match = cleaned.match(/^(\d+)(kb|mb|gb)$/);
    return match
        ? { size: Number(match[1]), unit: match[2] as SizeUnit }
        : { size: 0, unit: 'mb' as SizeUnit };
}


function formatOption(o: Options) {
    const { size, unit } = parseOptionValue(o.value);
    return {
        roleName: o.id.replace(/^\@drive-size-/, ''),
        size,
        unit,
        unlimited: size === Infinity
    };
}


// Helper to get all max-upload related options
async function fetchDriveSizeOptions() {
    const source = await getConnection();
    return source.getRepository(Options)
        .createQueryBuilder("o")
        .where("o.id LIKE :name", { name: `@drive-size-%` })
        .getMany();
}

export const getDriveSizeOptions = withAction<{}, DriveSizeOption[]>(async () => {
    const options = await fetchDriveSizeOptions();
    return {
        status: true,
        data: options.map(formatOption),
        message: 'Oke'
    }
});

export const addDriveSizeOptions = withAction<DriveSizeOption & { unlimited: boolean }>(async ({ roleName, size, unit, unlimited }) => {
    const source = await getConnection();
    const optionRepository = source.getRepository(Options);

    const id = `@drive-size-${roleName}`;
    let option = await optionRepository.findOne({ where: { id } });

    if (option) {
        option.value = unlimited ? 'unlimited' : `${size}${unit}`;
    } else {
        option = optionRepository.create({ id, value: unlimited ? 'unlimited' : `${size}${unit}` });
    }

    await optionRepository.save(option);
    const updated = await fetchDriveSizeOptions();

    return {
        status: true,
        data: updated.map(formatOption),
        message: 'Oke'
    }
});


