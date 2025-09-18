import { getConnection } from "@/data-source";
import { File } from "@/entities/File";
import { currentTime } from "@/libs/utils";

export default async function cleanTrashTask() {
   
    try {

        const connection = await getConnection();
        const fileRepository = connection.getRepository(File);
        const monthAgo = currentTime('-30d');
        const trashedFiles = await fileRepository.createQueryBuilder()
            .where("meta->>'trashed' = true")
            .where("meta->>'trashedAt' < :monthAgo", { monthAgo })
            .getMany();

        // If they have S3 keys, queue them for deletion
        for (const f of trashedFiles) {
            // @ts-ignore
            if (f.meta?.Key) {
                // @ts-ignore
                addTaskQueue("delete-file", { objectKey: f.meta.Key });
            }
        }

        await fileRepository.delete(trashedFiles.map(f => f.id));

    } catch (error) {
        
        console.error(`❌ Failed to clean trash:`, error);
        throw error;
    }
}