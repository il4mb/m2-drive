import fs from 'fs';
import path from 'path';
import { QueryCondition } from './database/types';

export function loadAllFunctions() {
    const functionsDir = path.join(__dirname, 'functions');
    const exportsMap: Record<string, any> = {};

    if (!fs.existsSync(functionsDir)) {
        console.warn('Functions directory does not exist:', functionsDir);
        return exportsMap;
    }

    const files = fs.readdirSync(functionsDir);

    files.forEach(file => {
        if (
            file.includes('index') ||
            file.includes('test') ||
            file.includes('loadAllUtils') ||
            !file.match(/\.(ts|js)$/)
        ) {
            return;
        }

        try {
            const filePath = path.join(functionsDir, file);

            // Use webpackIgnore comment to prevent webpack from analyzing
            const moduleExports = require(/* webpackIgnore: true */ filePath);

            Object.entries(moduleExports).forEach(([exportName, exportValue]) => {
                if (typeof exportValue === 'function') {
                    exportsMap[exportName] = exportValue;
                }
            });
        } catch (error) {
            console.warn(`Failed to load function from ${file}:`, error);
        }
    });

    return exportsMap;
}

export function createFunction<A extends Record<string, unknown>, R = any>(handler: (args: A) => Promise<R>) {
    return async (args: A) => {
        // Detect unknown props
        const allowedKeys = Object.keys(args as any);
        const expectedKeys = Object.keys(args as any); // Replace with explicit schema if needed
        const extraKeys = allowedKeys.filter(k => !expectedKeys.includes(k));
        if (extraKeys.length > 0) {
            throw new Error(`Unexpected properties: ${extraKeys.join(", ")}`);
        }
        return handler(args);
    };
}