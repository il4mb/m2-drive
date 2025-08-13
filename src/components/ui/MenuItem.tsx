'use client'

import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { IMenu } from '@/types';
import Link from 'next/link';

export interface MenuItemProps {
    menu: IMenu<"link">;
    shouldExpand?: boolean;
}
export default function MenuItem({ menu, shouldExpand }: MenuItemProps) {
    return (
        <ListItem
            component={Link}
            href={menu.href}
            sx={{ color: 'text.primary'}}>
            {menu.icon && (
                <ListItemIcon sx={{ mr: 1 }}>
                    {menu.icon}
                </ListItemIcon>
            )}
            {shouldExpand && (
                <ListItemText sx={{whiteSpace: "nowrap"}}>
                    {menu.label}
                </ListItemText>
            )}
        </ListItem>
    );
}