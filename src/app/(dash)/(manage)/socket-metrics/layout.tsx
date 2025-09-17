import PermissionSuspense from '@/components/PermissionSuspense';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {
    return (
        <PermissionSuspense permission={"can-see-socket-connection"}>
            {children}
        </PermissionSuspense>
    );
}