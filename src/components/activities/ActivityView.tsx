import { Avatar, Box, Stack, Typography } from '@mui/material';
import { createElement, ReactNode } from 'react';
import RelativeTime from '../RelativeTime';
import { Activity } from '@/entities/Activity';
import { ActivityIcon, CloudUpload, Copy, CopyX, FilePen, FolderOpen, FolderPlus, GitFork, ScanEye, Share2, Trash2, Users, Wifi, WifiOff } from 'lucide-react';
import { getColor } from '@/theme/colors';


const getTypeIcon = (status: string) => {
    if (status.endsWith("CONTRIBUTOR")) {
        return GitFork;
    }
    switch (status) {
        case 'CONNECT': return Wifi;
        case 'DISCONNECT': return WifiOff;
        case 'SHARE_FILE': return Share2;
        case 'EDIT_FILE': return FilePen;
        case 'VIEW_FILE': return ScanEye;
        case 'VIEW_FOLDER': return FolderOpen;
        case 'UPLOAD_FILE': return CloudUpload;
        case 'COPY_FILE': return Copy;
        case 'MOVE_FILE': return CopyX;
        case 'DELETE_FILE': return Trash2;
        case 'CREATE_FOLDER': return FolderPlus;
        default: return ActivityIcon;
    }
};

const getTypeColor = (status: string) => {
    switch (status) {
        case 'CONNECT': return 'success';
        case 'DISCONNECT': return 'error';
        case 'EDIT_FILE': return 'primary';
        case 'DELETE_FILE': return 'error';
        case 'COPY_FILE': return 'warning';
        case 'MOVE_FILE': return 'warning';
        default: return 'default';
    }
};


export interface ActivityViewProps {
    activity: Activity;
}
export default function ActivityView({ activity }: ActivityViewProps) {
    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Avatar sx={{ background: getColor(getTypeColor(activity.type) as any)[400], width: 32, height: 32 }}>
                {createElement(getTypeIcon(activity.type), { size: 18 })}
            </Avatar>
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                    {activity.description}
                </Typography>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Avatar src={activity.user.meta.avatar} sx={{ bgcolor: 'primary.main', width: 14, height: 14 }} />
                    <Typography variant="caption" color="text.secondary">
                        {activity.user.name} • <RelativeTime timestamp={activity.createdAt} />
                    </Typography>
                </Stack>
            </Box>
        </Box>
    );
}