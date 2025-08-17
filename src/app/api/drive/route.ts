
import { getSource } from "@/data-source"
import { DriveFile } from "@/entity/DriveFile";
import { withApi } from "@/libs/withApi"
import { FindOptionsWhere, IsNull } from "typeorm";



export const GET = withApi(async (req) => {

    const { searchParams } = new URL(req.url);

    const fId = searchParams.get('fId');
    const type = searchParams.get('type');

    const uId = '1';
    const source = await getSource();
    const repository = source.getRepository(DriveFile);
    
    const query: FindOptionsWhere<DriveFile> = { uId, fId: fId != null ? fId : IsNull() }
    if (type) {
        query.type = type;
    }


    const files = await repository.findBy(query);

    return {
        status: true,
        message: "Ok",
        data: JSON.parse(JSON.stringify(files))
    }
})