// lib/rules/databaseRules.ts
import { DatabaseRules, RuleRequest } from './rules/types';
import { RulesEngine } from './rules/engine';
import { allow, deny, isAuthenticated, isUser, hasField, fieldEquals, addFilter, and } from './rules/functions';

export const databaseRules: DatabaseRules = {
    
    file: {
        get: allow,
        list: allow,
        update: allow
    },

    publicFiles: {

        get: allow,
        list: allow,
        create: () => deny('Public files are read-only'),
        update: () => deny('Public files are read-only'),
        delete: () => deny('Public files are read-only'),
    },

    userFiles: {

        get: RulesEngine.createValidator(request =>
            and(isAuthenticated, isUser('ownerId'))(request)
        ),

        // @ts-ignore
        list: RulesEngine.createValidator(request => {
            
            if (!isAuthenticated(request)) return false;
            return addFilter('ownerId', '==', request.userId!);
        }),

        create: RulesEngine.createValidator(request =>
            and(
                isAuthenticated,
                hasField('ownerId'),
                fieldEquals('ownerId', request.userId)
            )(request)
        ),

        update: RulesEngine.createValidator(request =>
            and(
                isAuthenticated,
                isUser('ownerId'),
                (req: RuleRequest) => !req.data?.hasOwnProperty('ownerId')
            )(request)
        ),

        delete: RulesEngine.createValidator(request =>
            and(isAuthenticated, isUser('ownerId'))(request)
        ),
    },

    adminSettings: {
        get: RulesEngine.createValidator(request =>
            isAuthenticated(request) && request.user?.role === 'admin'
        ),

        list: RulesEngine.createValidator(request =>
            isAuthenticated(request) && request.user?.role === 'admin'
        ),

        create: () => deny('Admin access required'),
        update: () => deny('Admin access required'),
        delete: () => deny('Admin access required'),
    }
};