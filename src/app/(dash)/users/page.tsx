'use client'

import { getAllUser } from "@/actions/manage-users";
import Container from "@/components/Container";
import { useCheckMyPermission } from "@/components/context/CurrentUserAbilitiesProvider";
import useRequest from "@/hooks/useRequest";
import User from "@/entity/User";
import { Alert, AlertTitle, Avatar, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { Pen, Users2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function page() {

    const checkPermission = useCheckMyPermission();
    const canListuser = checkPermission('can-list-user');
    const canAddUser = checkPermission('can-add-user');
    const canEdituser = checkPermission('can-edit-user');

    const [users, setUsers] = useState<User[]>([]);
    const request = useRequest({
        action: getAllUser,
        onSuccess(result) {
            if (!canListuser) return;
            setUsers(result.data?.users || []);
        },
    });

    useEffect(() => {
        request.send()
    }, [])


    return (
        <Container maxWidth="lg" scrollable>

            <Stack component={Paper} p={2} mb={2} position={"sticky"} top={0} zIndex={10} boxShadow={2} borderRadius={2}>
                <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"}>
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <Users2 size={28} />
                        <Typography fontSize={22} fontWeight={600}>
                            Manage Pengguna
                        </Typography>
                    </Stack>
                    <Stack>
                        {canAddUser && (
                            <Button variant="contained" size="small" LinkComponent={Link} href="/users/create">
                                Tambah Pengguna
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Stack>

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
                                <Avatar src={e.meta.avatar} />
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