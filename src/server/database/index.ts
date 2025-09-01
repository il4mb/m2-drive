import { File } from "@/entity/File";
import User from "@/entity/User";
import Contributor from "@/entity/Contributor";
import { Options } from "@/entity/Options";
import Role from "@/entity/Role";
import Token from "@/entity/Token";
import { TaskQueueItem } from "@/entity/TaskQueueItem";


export const entityMap = {
    file: File,
    user: User,
    contributor: Contributor,
    options: Options,
    role: Role,
    token: Token,
    "task-queue": TaskQueueItem,
} as const;

export type EntityMap = typeof entityMap;
export type EntityName = keyof EntityMap;