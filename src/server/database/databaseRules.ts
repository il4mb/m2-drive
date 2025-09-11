// server/database/databaseRules.ts
import { EntityMap, EntityName } from ".";
import User from "@/entities/User";
import { DatabaseEvent } from "./databaseSubscriber";
import { DataSource } from "typeorm";
import { File } from "@/entities/File";
import { checkPermission } from "../checkPermission";

export interface DatabaseRuleContext<E = any> {
    user?: User | "system";
    collection: EntityName;
    event: DatabaseEvent;
    data?: Partial<E>;
    previousData?: Partial<E>;
    connection: DataSource;
}


/**
 * Generic type for a broadcast rule.
 * E = Entity type
 */
export type DatabaseRule<E> = (context: DatabaseRuleContext<E>) => (Promise<boolean> | boolean);

/**
 * Map of rules for each entities.
 * The `default` rule applies if no entities-specific rule is defined.
 */
type DatabaseRuleMap = {
    [K in EntityName]: DatabaseRule<InstanceType<EntityMap[K]>>;
} & {
    default: DatabaseRule<any>;
};

// @ts-ignore
export const databaseRules: DatabaseRuleMap = {

    default: (context) => {
        console.log("DEFAULT RULE");
        return !!context.user;
    },

    user: (context) => {
        const { user, event, data } = context;
        // Must be logged in
        if (!user) return false;
        if (user == "system") return true;

        if (event === "INSERT") {
            // Only admins can create users
            return user.meta.role === "admin";
        }

        if (event === "UPDATE") {
            // Users can update themselves
            if (data?.id === user.id) return true;
            // Admins can update anyone
            return user.meta.role === "admin";
        }

        if (event === "DELETE") {
            // Only admins can delete users
            return user.meta.role === "admin";
        }

        return false;
    },

    file: (context) => {
        const { user, event, data } = context;
        if (user == "system") return true;


        if (event === "UPDATE") {
            if (data?.uId === user?.id || user?.meta.role === "admin") return true;
        }
        if (event == "INSERT") {
            return Boolean(user);
        }
        if (event == "DELETE") {
            return Boolean(user);
        }
        return false;
    },

    contributor: async (context) => {

        const { connection, user, data } = context;

        if (user == "system") return true;

        const file = await connection.getRepository(File).findOneBy({ id: data?.fileId })
        if (file && (file.uId == user?.id || user?.meta.role === "admin")) {
            return true;
        }
        return true;
    },

    token: () => {
        return true;
    },
    task: async (context) => {
        const { user } = context;
        if (user == "system") return true;
        return await checkPermission("can-manage-task-queue");
    }
};
