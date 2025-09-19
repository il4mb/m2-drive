"use client"

import { ReactNode } from 'react';
import IDBMProvider from './IDBMProvider';
import { UploadsProvider } from './UploadsProvider';
import { DriveProvider } from './DriveProvider';
import { SnackbarProvider } from 'notistack';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const pdfOptions = {
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};


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
            <DriveProvider>
                <UploadsProvider>
                    {children}
                </UploadsProvider>
            </DriveProvider>
        </SnackbarProvider>
    );
}