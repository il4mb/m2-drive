import { ReactNode } from 'react';

export interface pageProps {
    children?: ReactNode;
}
export default function page({ children }: pageProps) {
    return (
        <div>
            page Component
            {children}
        </div>
    );
}