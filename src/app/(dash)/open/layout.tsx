'use client'
import Container from '@/components/Container';
import ParticipantsProvider from '@/components/rooms/ParticipantsProvider';
import RoomProvider from '@/components/rooms/RoomProvider';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';

export interface layoutProps {
    children?: ReactNode;
}
export default function layout({ children }: layoutProps) {

    const { fileId } = useParams<{ fileId: string }>();

    return (
        <RoomProvider roomId={fileId}>
            <ParticipantsProvider>
                <Container maxWidth={'lg'} fillHeight>
                    {children}
                </Container>
            </ParticipantsProvider>
        </RoomProvider>
    );
}