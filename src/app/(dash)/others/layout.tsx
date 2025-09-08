'use client'

import { ModuleViewerManager } from '@/viewer/ModuleViewerManager';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    return (
        <ModuleViewerManager endpoint='/opener/{ID}'>
            {children}
        </ModuleViewerManager>
    );
}