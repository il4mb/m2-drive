'use client';

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, CompletionContext, completeFromList } from '@codemirror/autocomplete';
import useDarkMode from '@/hooks/useDarkMode';

function contextAwareCompletion(schema: Record<string, string[]>) {
    return (context: CompletionContext) => {
        const before = context.state.sliceDoc(0, context.pos);
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;

        const lowerBefore = before.toLowerCase();

        // If last keyword was FROM or JOIN → suggest table names
        if (/\b(from|join)\s+\w*$/i.test(lowerBefore)) {
            const options = Object.keys(schema).map((table) => ({
                label: table,
                type: 'table',
            }));
            return { from: word.from, options, validFor: /^\w*$/ };
        }

        // If inside SELECT clause → suggest columns
        if (/\bselect\s+[\w,\s]*$/i.test(lowerBefore)) {
            const options: { label: string; type: string; detail?: string }[] = [];
            Object.entries(schema).forEach(([table, cols]) => {
                cols.forEach((col) =>
                    options.push({ label: col, type: 'column', detail: table })
                );
            });
            return { from: word.from, options, validFor: /^\w*$/ };
        }

        // If writing table.column → suggest that table’s columns
        const tableMatch = before.match(/(\w+)\.\w*$/);
        if (tableMatch) {
            const tableName = tableMatch[1];
            if (schema[tableName]) {
                const options = schema[tableName].map((col) => ({
                    label: col,
                    type: 'property',
                    detail: tableName,
                }));
                return { from: word.from, options, validFor: /^\w*$/ };
            }
        }

        // Default: suggest everything (keywords, tables, columns)
        const options: { label: string; type: string; detail?: string }[] = [];
        Object.keys(schema).forEach((table) => {
            options.push({ label: table, type: 'table' });
            schema[table].forEach((col) =>
                options.push({ label: col, type: 'column', detail: table })
            );
        });

        return { from: word.from, options, validFor: /^\w*$/ };
    };
}

interface SQLEditorProps {
    value: string;
    onChange?: (value: string) => void;
    height?: number | string;
    schema?: Record<string, string[]>;
}

export default function SQLEditor({
    value,
    height,
    schema = {},
    onChange,
}: SQLEditorProps) {
    const darkMode = useDarkMode();

    return (
        <CodeMirror
            value={value}
            theme={darkMode ? oneDark : 'light'}
            extensions={[
                sql(),
                autocompletion({
                    override: [contextAwareCompletion(schema)],
                }),
            ]}
            height={height as any}
            basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                foldGutter: true,
                autocompletion: true,
            }}
            onChange={(val) => onChange?.(val)}
        />
    );
}
