'use client'

import { IMenu } from '@/types';
import { Collapse, List, Stack, Typography } from '@mui/material';
import MenuItem from './MenuItem';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface MenuGroupProps {
    menu: IMenu<"group">;
    shouldExpand?: boolean;
}
export default function MenuGroup({ menu, shouldExpand }: MenuGroupProps) {

    const pathname = usePathname();
    const [open, setOpen] = useState(true);

    const allHrefs = menu.children.flatMap(item =>
        // @ts-ignore
        item.type === "group" ? item.children.map(c => c.href) : item.href ? [item.href] : []
    );
    const matched = allHrefs
        .filter(href => pathname.startsWith(href))
        .sort((a, b) => b.length - a.length);
    const currentActivePath = matched[0] || null;

    useEffect(() => {
        if (!open) setOpen(true);
    }, [shouldExpand]);

    return (
        <Stack my={3}>
            <Stack
                direction={'row'}
                justifyContent={"space-between"}
                alignItems={"center"}
                onClick={() => setOpen(!open)}>

                <Stack direction={'row'} spacing={1.5}>
                    {menu.icon && menu.icon}
                    {shouldExpand && (
                        <Typography component={"div"} fontSize={16} fontWeight={600} whiteSpace={"nowrap"}>
                            {menu.label}
                        </Typography>
                    )}
                </Stack>

                {shouldExpand && (
                    <ChevronDown size={18} style={{
                        scale: open ? "1" : "1 -1",
                        transition: 'all .15s ease'
                    }} />
                )}

            </Stack>

            <Collapse in={open}>
                <List sx={{ padding: shouldExpand ? 1 : 0 }}>
                    {menu.children.map((child, i) => child.type == "link"
                        ? <MenuItem key={i} menu={child} shouldExpand={shouldExpand} active={currentActivePath == child.href}/>
                        : <MenuGroup key={i} menu={child} />)}
                </List>
            </Collapse>
        </Stack>
    );
}