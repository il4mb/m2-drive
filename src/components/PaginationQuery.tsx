import { ReactNode } from 'react';

export interface PaginationQueryProps {
    children?: ReactNode;
}
export default function PaginationQuery({ children }: PaginationQueryProps) {

    


    return (
        <div>
            PaginationQuery Component
             {children}
        </div>
    );
}