"use client"

import { ReactNode } from 'react';
import IDBMProvider from './IDBMProvider';
import { UploadsProvider } from './UploadsProvider';
import { DriveProvider } from './DriveProvider';
import { SnackbarProvider } from 'notistack';

export interface AppProviderProps {
    children?: ReactNode;
}
export default function ContextInjector({ children }: AppProviderProps) {

    return (
        <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{
                vertical: "top",
                horizontal: "center"
            }}>
            <IDBMProvider>
                <DriveProvider>
                    <UploadsProvider>
                        {children}
                    </UploadsProvider>
                </DriveProvider>
            </IDBMProvider>
        </SnackbarProvider>
    );
}