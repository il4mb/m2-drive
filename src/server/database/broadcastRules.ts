// server/database/broadcastRules.ts
import { EntityMap, EntityName } from '.';
import { BroadcastContext } from './databaseSubscriber';

/**
 * Generic type for a broadcast rule.
 * E = Entity type
 */
export type BroadcastRule<E> = (context: BroadcastContext<E>) => (Promise<boolean> | boolean);

/**
 * Map of rules for each entities.
 * The `default` rule applies if no entities-specific rule is defined.
 */
type BroadcastRuleMap = {
    [K in EntityName]: BroadcastRule<InstanceType<EntityMap[K]>>;
} & {
    default: BroadcastRule<any>;
};

// @ts-ignore
export const broadcastRules: BroadcastRuleMap = {
    /**
     * Default rule: allow broadcast to authenticated users
     */
    default: async (context): Promise<boolean> => {
        return !!context.user;
    },

    /**
     * User entities broadcast rules
     */
    user: (context): boolean => {
        const { user, event, data } = context;

        // Always allow users to see their own data
        if (user && data.id === user.id) {
            return true;
        }

        // Only allow admins to see other users' data
        if (user?.meta.role === 'admin') {
            return true;
        }

        // For public user data (like usernames)
        if (event === 'INSERT' || event === 'UPDATE') {
            // @ts-ignore
            return data.isPublic === true;
        }

        return false;
    },

    /**
     * File entities broadcast rules
     */
    file: (context): boolean => {
        const { user, data } = context;
        return true;
    },

    task: () => {
        return true;
    }
};

// Helper functions for common rule patterns
export const BroadcastRules = {
    isAuthenticated: (context: BroadcastContext): boolean => !!context.user,

    isAdmin: (context: BroadcastContext): boolean => context.user?.meta.role === 'admin',

    isOwner: (context: BroadcastContext, idField: string = 'ownerId'): boolean =>
        context.user?.id === context.data[idField],

    hasRole: (context: BroadcastContext, roles: string[]): boolean =>
        context.user?.meta.role ? roles.includes(context.user.meta.role) : false,

    isPublic: (context: BroadcastContext): boolean =>
        context.data.isPublic === true,

    // hasPermission: (context: BroadcastContext, permission: string): boolean =>
    //     context.user?.permissions?.includes(perception) === true
};