'use client'

import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { IMenu } from '@/types';
import Link from 'next/link';
import { getColor } from '@/theme/colors';
import { useCheckMyPermission } from '../context/CurrentUserAbilitiesProvider';

export interface MenuItemProps {
    menu: IMenu<"link">;
    shouldExpand?: boolean;
    active: boolean;
}
export default function MenuItem({ menu, shouldExpand, active }: MenuItemProps) {

    const checkedPermission = useCheckMyPermission();

    if (menu.permission && !checkedPermission(menu.permission)) {
        return null;
    }

    return (
        <ListItem
            component={Link}
            href={menu.href}
            sx={{
                color: active ? "#fff" : 'text.primary',
                background: active ? getColor("primary")[400] : "",
                borderRadius: 3,
            }}>
            {menu.icon && (
                <ListItemIcon sx={{ mr: shouldExpand ? 1 : 0, color: active ? "#fff" : 'text.primary', opacity: 0.5 }}>
                    {menu.icon}
                </ListItemIcon>
            )}
            {shouldExpand && (
                <ListItemText sx={{ whiteSpace: "nowrap" }}>
                    {menu.label}
                </ListItemText>
            )}
        </ListItem>
    );
}