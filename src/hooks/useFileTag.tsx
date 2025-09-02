import { File } from "@/entity/File";
import { useEffect, useState } from "react";

export const useFileTags = (file: File|null, checktags: string[]) => {
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        setTags(file?.meta?.tags || []);
    }, [file]);

    // Check if at least one tag matches
    return tags.some(tag => checktags.includes(tag));
};
