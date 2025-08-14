import { getColor } from '@/theme/colors';
import { TypeFile } from '@/types';
import { Avatar, Box, ListItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { Globe } from 'lucide-react';

export interface DriveFileProps {
    file: TypeFile<Exclude<string, 'folder'>>;
}

export default function DriveFile({ file }: DriveFileProps) {
    return (
        <ListItem
            sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
            }}>
            <ListItemIcon>
                <FileIcon variant='solid' size={22} type={file.type} />
            </ListItemIcon>
            <Stack direction={"row"} flex={1}>
                <Box flex={1}>
                    <ListItemText sx={{ ml: 1, flex: 1 }}>
                        {file.name}
                    </ListItemText>
                </Box>
                <Stack direction={"row"} spacing={-1}>
                    <Avatar sx={{ width: 20, height: 20 }} />
                    <Avatar sx={{ width: 20, height: 20 }} />
                    <Avatar sx={{ width: 20, height: 20 }} />
                    <Avatar sx={{ width: 20, height: 20 }} >
                        <Globe size={14} stroke={getColor("secondary")[600]} />
                    </Avatar>
                </Stack>
            </Stack>
        </ListItem>
    );
}
