// server/database/broadcastRules.ts
import { EntityMap, EntityName } from '.';
import { BroadcastContext } from './databaseSubscriber';

/**
 * Generic type for a broadcast rule.
 * E = Entity type
 */
export type BroadcastRule<E> = (context: BroadcastContext<E>) => (Promise<boolean> | boolean);

/**
 * Map of rules for each entity.
 * The `default` rule applies if no entity-specific rule is defined.
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
     * User entity broadcast rules
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
     * File entity broadcast rules
     */
    file: (context): boolean => {
        const { user, data } = context;

        // Public files
        // @ts-ignore

        if (data.isPublic) {
            return true;
        }

        // File owner can see their files
        // @ts-ignore

        if (user && data.ownerId === user.id) {
            return true;
        }

        // Users with shared access
        // @ts-ignore

        if (user && data.sharedWith?.includes(user.id)) {
            return true;
        }

        // Admins can see all files
        if (user?.meta.role === 'admin') {
            return true;
        }

        return false;
    },
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