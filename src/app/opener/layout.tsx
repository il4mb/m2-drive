'use client'

import ContextMenu from '@/components/context-menu/ContextMenu';
import FileViewerLayout from '@/viewer/FileViewerLayout';
import { Stack } from '@mui/material';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {

    const { filesId } = useParams<{ filesId: string[] }>();
    const firstId = filesId?.[0];

    return (
        <ContextMenu>
            <Stack flex={1} overflow={"hidden"}>
                <FileViewerLayout pathList={filesId} pageEndpoint={`/opener/${firstId}/{ID}`}>
                    {children}
                </FileViewerLayout>
            </Stack>
        </ContextMenu>
    );
}