import { File } from "@/entities/File";
import User from "@/entities/User";
import Contributor from "@/entities/Contributor";
import { Options } from "@/entities/Options";
import Role from "@/entities/Role";
import Token from "@/entities/Token";
import { Task } from "@/entities/Task";
import { Activity } from "@/entities/Activity";


export const entityMap = {
    activity: Activity,
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