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
            <Paper
                sx={{
                    height: '100%',
                    display: 'flex',
                    borderRadius: 0,
                    boxShadow: 2,
                }}
                elevation={1}>

                <Stack flex={1} px={sidebar?.open ? 3 : 2} py={2}>
                    <Stack flex={1}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                            {sidebar?.open && (
                                <Typography variant="h6" component="div">
                                    M2 Drive
                                </Typography>
                            )}
                            <IconButton onClick={() => sidebar?.setOpen(prev => !prev)} sx={{ border: 'none', ml: 0.5 }}>
                                <Box component={ChevronLeft} sx={{ scale: sidebar?.open ? '1 1' : '-1.2 1.2', transition: 'all .2s ease' }} />
                            </IconButton>
                        </Stack>

                        {sidebar?.open && (
                            <Badge badgeContent={totalUpload} color="primary">
                                <Button
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

                        <List sx={{ p: 0, m: 0, ml: sidebar?.open ? 0 : -1 }}>
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
                    </Stack>

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
            </Paper>
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