"use client"

import { ReactNode } from 'react';
import IDBMProvider from './IDBMProvider';
import { UploadsProvider } from './UploadsProvider';
import { DriveProvider } from './DriveProvider';

export interface AppProviderProps {
    children?: ReactNode;
}
export default function ContextInjector({ children }: AppProviderProps) {

    return (
        <IDBMProvider>
            <DriveProvider>
                <UploadsProvider>
                    {children}
                </UploadsProvider>
            </DriveProvider>
        </IDBMProvider>
    );
}