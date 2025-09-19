import { ReactNode } from 'react';
import DriveLayout from './ui/DriveLayout';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    
    return (
        <DriveLayout>
            {children}
        </DriveLayout>
    );
}