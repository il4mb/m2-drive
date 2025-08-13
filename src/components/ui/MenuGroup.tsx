'use client'

import { IMenu } from '@/types';
import { Collapse, List, Stack, Typography } from '@mui/material';
import MenuItem from './MenuItem';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface MenuGroupProps {
    menu: IMenu<"group">;
    shouldExpand?: boolean;
}
export default function MenuGroup({ menu, shouldExpand }: MenuGroupProps) {

    const [open, setOpen] = useState(true);

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
                        ? <MenuItem key={i} menu={child} shouldExpand={shouldExpand} />
                        : <MenuGroup key={i} menu={child} />)}
                </List>
            </Collapse>
        </Stack>
    );
}