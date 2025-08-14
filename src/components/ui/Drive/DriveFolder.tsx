'use client'

import { isFolder, TypeFolder } from '@/types';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DriveFile from './DriveFile';

export interface DriveFolderProps {
    file: TypeFolder;
}

export default function DriveFolder({ file }: DriveFolderProps) {
    const [expand, setExpand] = useState(false);

    return (
        <>
            <ListItem
                onClick={() => setExpand(prev => !prev)}
                sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                }}>
                <ListItemIcon>
                    {expand ? <FolderOpen /> : <Folder />}
                </ListItemIcon>
                <ListItemText sx={{ ml: 1 }}>
                    {file.name}
                </ListItemText>
            </ListItem>

            <AnimatePresence initial={false}>
                {expand && (
                    <motion.div
                        key="folder-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}>
                        <List sx={{ pl: 4 }}>
                            {file.files.length === 0 && (
                                <ListItem sx={{ color: 'text.secondary' }}>
                                    <ListItemText>
                                        Tidak ada file!
                                    </ListItemText>
                                </ListItem>
                            )}
                            {file.files.map((file, i) => (
                                isFolder(file)
                                    ? <DriveFolder key={i} file={file} />
                                    : <DriveFile key={i} file={file} />
                            ))}
                        </List>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
