import { ReactNode, useEffect } from 'react';
import { Avatar, Box, Stack, Tooltip } from '@mui/material';
import { useFileViewers } from './FileViewersProvider';
import { AnimatePresence, motion } from 'motion/react';

export interface WhoViewerProps {
    children?: ReactNode;
}
export default function WhoViewer() {

    const viewers = useFileViewers();

    useEffect(() => {
        return () => {
            console.log("UNMOUNT")
        }
    }, [])

    return (
        <Stack direction={"row"} mr={2}>
            <AnimatePresence mode={'wait'}>
                {viewers?.map((p, i) => (
                    <Box
                        component={motion.div}
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        key={p.uid}>
                        <Tooltip title={`${p.displayName || "Unknown"}${p.isGuest ? " (tamu)" : ""}`} arrow>
                            <Avatar sx={{ width: 30, height: 30, ml: -1 }} src={p.avatar}>
                                {p.isGuest ? "?" : `${p.displayName || "Unknown"}`.substring(1, -1)}
                            </Avatar>
                        </Tooltip>
                    </Box>
                ))}
            </AnimatePresence>
        </Stack>
    );
}