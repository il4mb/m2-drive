'use client'

import { Avatar, Box, IconButton, List, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Archive, ChevronLeft, FolderOpen, History, Home, Info, Share2, Trash } from 'lucide-react';
import { IMenu } from '@/types';
import MenuItem from './MenuItem';
import MenuGroup from './MenuGroup';
import ThemeToggle from './ThemeToggle';
import { motion } from "framer-motion";
import Ediska from '../icon/Ediska';
import { usePathname } from 'next/navigation';


const MENU: IMenu[] = [
    {
        type: "link",
        label: "Beranda",
        icon: <Home />,
        href: "/"
    },
    {
        type: "link",
        label: "Drive",
        icon: <FolderOpen />,
        href: "/drive"
    },
    {
        type: "link",
        label: "Histori",
        icon: <History />,
        href: "/history"
    },
    {
        type: "link",
        label: "Arsip",
        icon: <Archive />,
        href: "/archive"
    },
    {
        type: 'group',
        label: "Lain-Lain",
        children: [
            {
                type: "link",
                label: "Tempat Sampah",
                icon: <Trash />,
                href: "/others/deleted"
            },
            {
                type: "link",
                label: "Di Bagikan",
                icon: <Share2 />,
                href: "/others/sharing"
            },

        ]
    },
    {
        type: "link",
        label: "Tentang",
        icon: <Info />,
        href: "/about"
    },
]


export default function Sidebar() {

    const pathname = usePathname();
    const [open, setOpen] = useState(true);

    const allHrefs = MENU.flatMap(item =>
        // @ts-ignore
        item.type === "group" ? item.children.map(c => c.href) : item.href ? [item.href] : []
    );
    const matched = allHrefs
        .filter(href => pathname.startsWith(href))
        .sort((a, b) => b.length - a.length);
    const currentActivePath = matched[0] || null;

    return (
        <Stack
            component={motion.div}
            layout
            animate={{ width: open ? 300 : 70 }}
            sx={{
                maxWidth: '300px',
                overflow: 'hidden'
            }}
            boxShadow={4}>
            <Paper sx={{ flex: 1, display: 'flex' }}>
                <Stack flex={1} p={open ? 4 : 2}>

                    <Stack
                        direction={"row"}
                        spacing={1}
                        alignItems={"center"}
                        justifyContent={"space-between"}
                        onClick={() => !open && setOpen(true)}>
                        <Stack
                            direction={"row"}
                            spacing={1}
                            alignItems={"flex-end"}
                            sx={{ pl: open ? 0 : 0.4, opacity: 0.8 }}>
                            {/* <Ediska
                                width={open ? "2rem" : "2rem"}
                                height={open ? "2rem" : "2rem"} /> */}
                            {open && (
                                <Typography
                                    component={"div"}
                                    fontSize={14}
                                    fontWeight={900}
                                    pl={1}
                                    whiteSpace={"nowrap"}>
                                    Sistem Integrasi Penyimpanan
                                </Typography>
                            )}
                        </Stack>
                        {open && (
                            <IconButton onClick={() => setOpen(prev => !prev)}>
                                <ChevronLeft
                                    size={20}
                                    style={{
                                        scale: open ? "1" : "-1 1"
                                    }} />
                            </IconButton>
                        )}
                    </Stack>

                    <Stack flex={1} mt={2}>
                        <List sx={{ p: 0, m: 0, ml: open ? 0 : -1 }}>
                            {MENU.map((child, i) => {
                                return (
                                    child.type == "link"
                                        ? <MenuItem key={i} menu={child} shouldExpand={open} active={currentActivePath == child.href} />
                                        : <MenuGroup key={i} menu={child} shouldExpand={open} />
                                )
                            })}
                        </List>
                    </Stack>

                    <Stack mb={5} ml={open ? 0 : -2}
                        direction={open ? "row" : "column"}
                        spacing={2}
                        alignItems={"center"}
                        justifyContent={"space-between"}>
                        <Stack direction={"row"} spacing={2} alignItems={"center"}>
                            <Avatar />
                            {open && (
                                <Box>
                                    <Typography component={"div"} fontWeight={600} fontSize={18}>Ilham B</Typography>
                                    <Typography component={"div"} color='text.secondary'>Admin</Typography>
                                </Box>
                            )}
                        </Stack>
                        <ThemeToggle />
                    </Stack>
                </Stack>
            </Paper>

        </Stack>

    );
}