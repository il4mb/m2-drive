'use client'

import FileViewerLayout from '@/viewer/FileViewerLayout';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {

    const { filesId } = useParams<{ filesId: string[] }>();
    const firstId = filesId?.[0];

    return (
        <FileViewerLayout pathList={filesId} pageEndpoint={`/opener/${firstId}/{ID}`}>
            {children}
        </FileViewerLayout>
    );
}