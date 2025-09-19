'use client'

import { Box, IconButton, List, Paper, Stack, Typography, useMediaQuery, Theme, Button, Chip, Badge } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, FolderOpen, FolderRoot, History, Home, Info, Settings, Share2, Trash, Users2, Menu, ChartArea, Cpu, FilePlus, CloudUpload } from 'lucide-react';
import { IMenu } from '@/types';
import MenuItem from './MenuItem';
import MenuGroup from './MenuGroup';
import ThemeToggle from './ThemeToggle';
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import { useMyAbilities } from '@/components/context/CurrentUserAbilitiesProvider';
import UserAvatar from '../ui/UserAvatar';
import { useSidebar } from './SidebarProvider';
import LogoutButton from '../ui/LogoutButton';
import { useUploads } from '../context/UploadsProvider';
import M2Drive from '../icon/M2Drive';
import { getColor } from '@/theme/colors';
import useDarkMode from '@/hooks/useDarkMode';

const MENU: IMenu[] = [
    {
        type: "link",
        label: "Beranda",
        icon: <Home />,
        href: "/"
    },
    {
        type: "link",
        label: "My Drive",
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
        label: "Manage Pengguna",
        icon: <Users2 />,
        href: "/users",
        permission: 'can-list-user'
    },
    {
        type: "link",
        label: "Socket Metrics",
        icon: <ChartArea />,
        href: "/socket-metrics",
        permission: 'can-see-socket-connection'
    },
    {
        type: "link",
        label: "Drive Metrics",
        icon: <FolderRoot />,
        href: "/drive-metrics",
        permission: 'can-see-drive-root'
    },
    {
        type: "link",
        label: "Task Queue",
        icon: <Cpu />,
        href: "/task-queue",
        permission: 'can-see-task-queue'
    },
    {
        type: "link",
        label: "Pengaturan",
        icon: <Settings />,
        href: "/settings",
        permission: 'can-see-system-settings'
    },
    {
        type: "link",
        label: "Tentang",
        icon: <Info />,
        href: "/about"
    },
]

export default function SidebarDrawer() {

    const dark = useDarkMode();
    const upload = useUploads();
    const pathname = usePathname();
    const sidebar = useSidebar();
    const session = useCurrentSession();
    const { role } = useMyAbilities();
    const totalUpload = useMemo(() => upload.uploads.length, [upload]);

    const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Close sidebar when route changes on mobile
    useEffect(() => {
        if (isMobile) {
            sidebar?.setOpen(false);
        }
    }, [pathname, isMobile]);

    const allHrefs = MENU.flatMap(item =>
        // @ts-ignore
        item.type === "group" ? item.children.map(c => c.href) : item.href ? [item.href] : []
    );
    const matched = allHrefs
        .filter(href => pathname.startsWith(href))
        .sort((a, b) => b.length - a.length);
    const currentActivePath = matched[0] || null;

    // Mobile sidebar component
    const mobileSidebar = (
        <AnimatePresence>
            {sidebar?.open && (
                <>
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 1199,
                        }}
                        onClick={() => sidebar?.setOpen(false)}
                    />
                    <Paper
                        component={motion.div}
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: 300,
                            zIndex: 1200,
                            borderRadius: 0,
                            overflowY: 'auto',
                        }}
                        elevation={16}>
                        <Stack height="100%" px={3} py={2}>

                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="h6" component="div">
                                    M2 Drive
                                </Typography>
                                <IconButton onClick={() => sidebar?.setOpen(false)}>
                                    <ChevronLeft />
                                </IconButton>
                            </Stack>

                            <Stack flex={1}>
                                <List sx={{ p: 0, m: 0 }}>
                                    {MENU.map((child, i) => (
                                        child.type == "link"
                                            ? <MenuItem
                                                key={i}
                                                menu={child}
                                                shouldExpand={true}
                                                active={currentActivePath == child.href}
                                            />
                                            : <MenuGroup
                                                key={i}
                                                menu={child}
                                                shouldExpand={true}
                                            />
                                    ))}
                                </List>
                            </Stack>

                            <Stack direction={"row"} justifyContent={"space-between"} mt="auto" py={2} spacing={2} mb={2}>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                    component={Link}
                                    href="/profile"
                                    sx={{
                                        textDecoration: 'none',
                                        color: 'inherit'
                                    }}
                                    onClick={() => sidebar?.setOpen(false)}>
                                    <UserAvatar userId={session?.user?.id} />
                                    <Box>
                                        <Typography component="div" fontWeight={600} fontSize={18}>
                                            {session?.user?.name}
                                        </Typography>
                                        <Typography component="div" color="text.secondary">
                                            {role?.label}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ThemeToggle />
                            </Stack>
                            <LogoutButton />
                        </Stack>
                    </Paper>
                </>
            )}
        </AnimatePresence>
    );

    // Desktop sidebar component
    const desktopSidebar = (
        <Stack
            component={motion.div}
            animate={{ width: sidebar?.open ? 300 : 90 }}
            transition={{ duration: 0.2 }}
            sx={{
                width: sidebar?.open ? 310 : 90,
                height: '100%',
                overflow: 'hidden',
                flexShrink: 0,
                pr: 2
            }}>
            <Stack
                component={Paper}
                flex={1}
                sx={(theme) => ({
                    height: '100%',
                    overflow: 'hidden',
                    maxHeight: '100dvh',
                    display: 'flex',
                    borderRadius: 0,
                    boxShadow: 2,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.07)',
                })}
                elevation={1}>

                <Stack flex={1} overflow={"auto"} className='no-scrollbar'>
                    <Stack flex={1}>
                        <Stack
                            px={2}
                            py={1}
                            boxShadow={0}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            mb={2}
                            position={"sticky"}
                            top={0}
                            borderRadius={0}
                            zIndex={100}>
                            <Stack direction={"row"} alignItems={"center"} spacing={1}>
                                <Stack
                                    width={'2.8em'}
                                    height={'2.8em'}
                                    justifyContent={"center"}
                                    alignItems={"center"}
                                    sx={{
                                        ...(!sidebar?.open && {
                                            background: getColor("primary")[dark ? 500 : 200],
                                            borderRadius: 2
                                        })
                                    }}>
                                    <M2Drive
                                        color={getColor("primary")[dark ? 100 : 500]}
                                        width={sidebar?.open ? '2.8em' : '2em'}
                                        height={sidebar?.open ? '2.8em' : '2em'}
                                        onClick={() => sidebar?.setOpen(prev => !prev)} />
                                </Stack>
                                {sidebar?.open && (
                                    <Typography variant="h5" component="div" fontWeight={800}>
                                        Drive
                                    </Typography>
                                )}
                            </Stack>
                            {sidebar?.open && (
                                <IconButton onClick={() => sidebar?.setOpen(prev => !prev)} sx={{ border: 'none', ml: 0.5 }}>
                                    <Box component={ChevronLeft} sx={{ scale: sidebar?.open ? '1 1' : '-1.2 1.2', transition: 'all .2s ease' }} />
                                </IconButton>
                            )}
                        </Stack>
                        <Stack flex={1} px={2} pb={2}>

                            {sidebar?.open && (
                                <Badge badgeContent={totalUpload} color="primary">
                                    <Button
                                        disabled={pathname == "/drive/upload"}
                                        LinkComponent={Link}
                                        href='/drive/upload'
                                        startIcon={<CloudUpload size={26} strokeWidth={3} />}
                                        variant='outlined'
                                        size='large'
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: 22,
                                            borderRadius: 4,
                                            width: '100%',
                                            mb: 1
                                        }}>
                                        Upload
                                    </Button>
                                </Badge>
                            )}

                            <List sx={{ p: 0, m: 0, ml: sidebar?.open ? 0 : -1, mr: sidebar?.open ? 0 : -1 }}>
                                {MENU.map((child, i) => (
                                    child.type == "link"
                                        ? <MenuItem
                                            key={i}
                                            menu={child}
                                            shouldExpand={sidebar?.open}
                                            active={currentActivePath == child.href}
                                        />
                                        : <MenuGroup
                                            key={i}
                                            menu={child}
                                            shouldExpand={sidebar?.open}
                                        />
                                ))}
                            </List>

                            <Stack mt="auto" py={2}
                                direction={sidebar?.open ? "row" : "column"}
                                spacing={2}
                                alignItems={sidebar?.open ? "center" : "flex-start"}
                                justifyContent={sidebar?.open ? "space-between" : "center"}
                                mb={2}>
                                <Stack
                                    direction={sidebar?.open ? "row" : "column"}
                                    spacing={sidebar?.open ? 2 : 1}
                                    alignItems="center"
                                    component={Link}
                                    href="/profile"
                                    sx={{
                                        textDecoration: 'none',
                                        color: 'inherit'
                                    }}>
                                    <UserAvatar size={40} userId={session?.user?.id} />
                                    {sidebar?.open && (
                                        <Box>
                                            <Typography component="div" fontWeight={600} fontSize={18}>
                                                {session?.user?.name}
                                            </Typography>
                                            <Typography component="div" color="text.secondary">
                                                {role?.label}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                                <ThemeToggle />
                            </Stack>
                            {sidebar?.open && (
                                <LogoutButton />
                            )}

                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );

    // Don't render until mounted to avoid hydration issues
    if (!isMounted) {
        return null;
    }

    return (
        <>
            {isMobile ? mobileSidebar : desktopSidebar}
        </>
    );
}

// Add this component to your layout to include a mobile menu button
export function SidebarToggleButton() {
    const sidebar = useSidebar();
    const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

    if (!isMobile) return null;

    return (
        <IconButton
            onClick={() => sidebar?.setOpen(!sidebar?.open)}
            sx={{ mr: 1 }}
            aria-label="Toggle menu">
            <Menu />
        </IconButton>
    );
}