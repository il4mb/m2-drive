import { Stack } from '@mui/material';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {


    return (
        <Stack flex={1}>
            {children}
        </Stack>
    );
}