'use client'

import { DriveFile, IDriveFile } from '@/entity/DriveFile';
import { createContext, useContext, useState, ReactNode } from 'react';
import FolderPickerDialog from '../ui/drive/FolderPickerDialog';

interface DriveProviderState {
    openFolderPicker: (title?: string, disabled?: boolean | string[]) => Promise<DriveFile | null>;
}

type FolderPicker = {
    id: string;
    title?: string;
    disabled?: boolean | string[];
    onClose: () => void;
    onSelect: (file: IDriveFile | null) => void;
};

type DriveProviderProps = {
    children?: ReactNode;
};

export const DriveProvider = ({ children }: DriveProviderProps) => {

    const [folderPickers, setFolderPickers] = useState<FolderPicker[]>([]);

    const openFolderPicker = async (title?: string, disabled?: boolean | string[]): Promise<IDriveFile | null> => {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();

            const picker: FolderPicker = {
                id,
                title,
                disabled,
                onClose: () => {
                    setFolderPickers((prev) => prev.filter((p) => p.id !== id));
                    reject(null);
                },
                onSelect: (file) => {
                    resolve(file);
                    setFolderPickers((prev) => prev.filter((p) => p.id !== id));
                },
            };

            setFolderPickers((prev) => [...prev, picker]);
        });
    };

    return (
        <Context.Provider value={{ openFolderPicker }}>
            {children}

            {folderPickers.map((picker) => (
                <FolderPickerDialog
                    key={picker.id}
                    title={picker.title}
                    disabled={picker.disabled}
                    open
                    onClose={picker.onClose}
                    onSelect={picker.onSelect}
                />
            ))}
        </Context.Provider>
    );
};

const Context = createContext<DriveProviderState | undefined>(undefined);

export const useDrive = () => {
    const context = useContext(Context);
    if (!context) throw new Error('useDrive must be used within a DriveProvider');
    return context;
};
