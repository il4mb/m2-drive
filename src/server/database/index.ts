import { File } from "@/entity/File";
import User from "@/entity/User";
import Contributor from "@/entity/Contributor";
import { Options } from "@/entity/Options";
import Role from "@/entity/Role";
import Token from "@/entity/Token";
import { Task } from "@/entity/Task";


export const entityMap = {
    file: File,
    user: User,
    contributor: Contributor,
    options: Options,
    role: Role,
    token: Token,
    "task": Task,
} as const;

export type EntityMap = typeof entityMap;
export type EntityName = keyof EntityMap;