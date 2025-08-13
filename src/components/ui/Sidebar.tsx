'use client'

import { Avatar, Box, IconButton, List, Paper, Stack, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';
import BankData from '../icon/BankData';
import { ChevronLeft, FolderOpen, Home } from 'lucide-react';
import { IMenu } from '@/types';
import MenuItem from './MenuItem';
import MenuGroup from './MenuGroup';
import ThemeToggle from './ThemeToggle';
import { motion } from "framer-motion";


const MENU: IMenu[] = [
    {
        type: "link",
        label: "Beranda",
        icon: <Home />,
        href: "/"
    },
    {
        type: "link",
        label: "Drive Saya",
        icon: <FolderOpen />,
        href: "/"
    },
    {
        type: 'group',
        label: "Lain-Lain",
        children: [
            {
                type: "link",
                label: "Beranda",
                icon: <Home />,
                href: "/"
            },
            {
                type: "link",
                label: "Drive Saya",
                icon: <FolderOpen />,
                href: "/"
            },
            {
                type: 'group',
                label: "Lain-Lain",
                children: [
                    {
                        type: "link",
                        label: "Beranda",
                        icon: <Home />,
                        href: "/"
                    },
                    {
                        type: "link",
                        label: "Drive Saya",
                        icon: <FolderOpen />,
                        href: "/"
                    },
                ]
            }
        ]
    }
]


export default function Sidebar() {

    const [open, setOpen] = useState(true);

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
                            sx={{ pl: open ? 0 : 0.4 }}>
                            <BankData />
                            {open && (
                                <Typography
                                    component={"div"}
                                    fontSize={24}
                                    fontWeight={900}
                                    whiteSpace={"nowrap"}>
                                    Bank Data
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
                            {MENU.map((child, i) => child.type == "link"
                                ? <MenuItem key={i} menu={child} shouldExpand={open} />
                                : <MenuGroup key={i} menu={child} shouldExpand={open} />)}
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