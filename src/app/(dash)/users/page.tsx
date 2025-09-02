'use client'

import Container from "@/components/Container";
import { useCheckMyPermission } from "@/components/context/CurrentUserAbilitiesProvider";
import User from "@/entity/User";
import { Alert, AlertTitle, Button, Chip, LinearProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Calendar, CaseSensitive, Clock, Pen, Users2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import StickyHeader from "@/components/StickyHeader";
import { motion } from "motion/react";
import UserAvatar from "@/components/ui/UserAvatar";
import Menu from "@/components/context-menu/Menu";

export default function page() {

    const checkPermission = useCheckMyPermission();
    const canListuser = checkPermission('can-list-user');
    const canAddUser = checkPermission('can-add-user');
    const canEdituser = checkPermission('can-edit-user');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState<keyof typeof User['prototype']>('createdAt');
    const [order, setOrder] = useState<"DESC" | "ASC">('DESC');

    const menuItem = useMemo(() => ([
        {
            icon: CaseSensitive,
            label: "Sort By Name",
            action: () => setSortBy("name"),
            active: sortBy === "name"
        },
        {
            icon: Calendar,
            label: "Sort By Create Date",
            action: () => setSortBy("createdAt"),
            active: sortBy === "createdAt"
        },
        {
            icon: Clock,
            label: "Sort By Update Date",
            action: () => setSortBy("updatedAt"),
            active: sortBy === "updatedAt"
        },
        { type: 'divider' } as const,
        {
            icon: ArrowDownWideNarrow,
            label: "Order DESC",
            action: () => setOrder("DESC"),
            active: order === "DESC"
        },
        {
            icon: ArrowUpNarrowWide,
            label: "Order ASC",
            action: () => setOrder("ASC"),
            active: order === "ASC"
        }
    ]), [order, sortBy])

    const { users, loading } = useUsers({
        keyword,
        sortBy,
        order
    });

    return (
        <Container maxWidth="lg" scrollable>

            <StickyHeader loading={loading}>
                <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"} position={"relative"}>
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <Users2 size={28} />
                        <Typography fontSize={22} fontWeight={600}>
                            Manage Pengguna
                        </Typography>
                    </Stack>
                    <Stack direction={"row"} spacing={1}>
                        <Menu items={menuItem}
                            buttonProps={{ disabled: loading }}
                        />
                        <TextField
                            size="small"
                            label={"Cari..."}
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)} />
                        {canAddUser && (
                            <Button variant="contained" size="small" LinkComponent={Link} href="/users/create">
                                Tambah Pengguna
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </StickyHeader>

            <Stack component={Paper} p={2} flex={1} borderRadius={2}>
                <Stack p={2} flex={1}>

                    {!canListuser && (
                        <Alert severity="warning" sx={{ mb: 3 }} variant="outlined">
                            <AlertTitle>Kesalahan Wewenang</AlertTitle>
                            Kamu tidak memiliki wewenang untuk melihat daftar pengguna!
                        </Alert>
                    )}

                    {users.length == 0 && (
                        <Stack>
                            <Typography fontSize={16}>Tidak ada pengguna!</Typography>
                        </Stack>
                    )}
                    {users.map((e, i) => (
                        <Stack
                            key={e.id}
                            component={motion.div}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            transition={{ delay: 0.05 * i }}
                            sx={{
                                p: 1.5,
                                borderRadius: 1,
                                "&:hover": {
                                    bgcolor: 'action.hover'
                                }
                            }}
                            direction={"row"}
                            gap={1}
                            alignItems={"center"}
                            justifyContent={"space-between"}>
                            <Stack direction={"row"} gap={1} alignItems={"center"}>
                                <UserAvatar userId={e.id} />
                                <Stack>
                                    <Typography component={'div'} fontSize={18} fontWeight={600}>
                                        {e.name}
                                        <Chip
                                            label={e.meta.role}
                                            sx={{ ml: 2 }} />
                                    </Typography>
                                    <Typography component={'div'} color="text.secondary" fontSize={12}>
                                        {e.email}
                                    </Typography>
                                </Stack>
                            </Stack>
                            <Stack>
                                {canEdituser && (
                                    <Button
                                        LinkComponent={Link}
                                        href={`/users/${e.id}/edit`}
                                        startIcon={<Pen size={16} />}
                                        size="small">
                                        Sunting
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
            </Stack>
        </Container>
    )
}