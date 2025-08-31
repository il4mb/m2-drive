import { getConnection } from "@/data-source";
import { File } from "@/entity/File";
import { withApi } from "@/libs/withApi";
import { NextRequest } from "next/server";
import { Brackets } from "typeorm";

export const GET = withApi(async (req: NextRequest) => {

    const uId = "1";
    const source = await getConnection();
    const repository = source.getRepository(File);

    const notTrashed = new Brackets(qb => {
        qb.where("file.meta IS NULL")
            .orWhere("file.meta ->> 'trashed' IS NULL")
            .orWhere("file.meta ->> 'trashed' = 'false'");
    });

    const lastAdded = await repository.createQueryBuilder("file")
        .where("file.uId = :uId", { uId })
        .andWhere(notTrashed)
        .orderBy("file.createdAt", "DESC")
        .limit(10)
        .getMany();

    const lastUpdated = await repository.createQueryBuilder("file")
        .where("file.uId = :uId", { uId })
        .andWhere(notTrashed)
        .andWhere("file.updatedAt IS NOT NULL")
        .orderBy("file.updatedAt", "DESC")
        .limit(10)
        .getMany();

    const lastOpened = await repository.createQueryBuilder("file")
        .where("file.uId = :uId", { uId })
        .andWhere("file.meta ->> 'lastOpen' IS NOT NULL")
        .andWhere(notTrashed)
        .orderBy("CAST(file.meta ->> 'lastOpen' AS BIGINT)", "DESC")
        .limit(10)
        .getMany();

    return {
        status: true,
        message: "Ok",
        data: {
            lastAdded,
            lastUpdated,
            lastOpened,
        },
    };
});
