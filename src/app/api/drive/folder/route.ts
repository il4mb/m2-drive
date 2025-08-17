import { getSource } from "@/data-source";
import { DriveFile } from "@/entity/DriveFile";
import { DATE_EPOCH } from "@/libs/utils";
import { withApi } from "@/libs/withApi";
import { randomBytes } from "crypto";
import { IsNull } from "typeorm";

export const POST = withApi(async (req) => {

    const json = await req.json();
    if (!json.name || (json.fId != null && typeof json.fId != "string")) throw new Error("400: Please enter valid form!");

    const uId = '1';
    const name = json.name as string;
    const fId = json.fId as string | undefined | null;

    if (name.length > 64) throw new Error("400: Folder name should not more than 64 characters!");

    const source = await getSource();
    const repo = source.getRepository(DriveFile);
    const exist = await repo.existsBy({
        uId,
        name,
        fId: fId ? fId : IsNull()
    });

    if (exist) throw new Error("400: Folder with same name alredy exist!");

    const file = new DriveFile();
    file.id = randomBytes(12).toString('hex');
    file.uId = uId;
    file.fId = fId || null;
    file.name = name;
    file.type = "folder";
    file.createdAt = (Date.now() / 1000) - DATE_EPOCH;
    await repo.save(file);

    return {
        status: true,
        message: "Folder created!",
        data: JSON.parse(
            JSON.stringify(file)
        )
    }
});


/**
 * Recursively get all descendant ids of a folder
 */
async function collectDescendants(repo: any, id: string): Promise<string[]> {
    const children = await repo.find({
        where: { fId: id },
        select: ["id"],
    });

    let ids: string[] = [];
    for (const child of children) {
        ids.push(child.id);
        const deeper = await collectDescendants(repo, child.id);
        ids = ids.concat(deeper);
    }
    return ids;
}

export const DELETE = withApi(async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const confirm = searchParams.get("confirm");

    if(confirm != "HAPUS") throw new Error("400: Confirm incorrect!");

    if (!id) throw new Error("400: Missing folder id!");

    const uId = "1";
    const source = await getSource();
    const repo = source.getRepository(DriveFile);

    const folder = await repo.findOne({ where: { id, uId, type: "folder" } });
    if (!folder) throw new Error("404: Folder not found!");

    // collect all descendants
    const descendants = await collectDescendants(repo, id);

    // delete all descendants + the folder itself
    await repo.delete([...descendants, id]);

    return {
        status: true,
        message: `Folder "${folder.name}" and all its contents deleted!`,
        deletedIds: [id, ...descendants],
    };
});