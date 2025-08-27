'use client'

import { getAllUser } from "@/actions/manage-users";
import useRequest from "@/components/hooks/useRequest";
import User from "@/entity/User";
import { Avatar, Button, Stack, Typography } from "@mui/material";
import { Pen, Users2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function page() {

    const [users, setUsers] = useState<User[]>([]);
    const request = useRequest({
        action: getAllUser,
        onSuccess(result) {
            console.log(result)
            setUsers(result.data?.users || []);
        },
    });

    useEffect(() => {
        request.send()
    }, [])

    return (
        <Stack m={2}>
            <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"} py={1} mb={1}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Users2 />
                    <Typography fontSize={22} fontWeight={600}>
                        Manage Pengguna
                    </Typography>
                </Stack>
                <Stack>
                    <Button variant="contained" size="small" LinkComponent={Link} href="/users/create">
                        Tambah Pengguna
                    </Button>
                </Stack>
            </Stack>

            <Stack px={2}>
                {users.length == 0 && (
                    <Stack>
                        <Typography fontSize={16}>Tidak ada pengguna!</Typography>
                    </Stack>
                )}
                {users.map((e, i) => (
                    <Stack direction={"row"} gap={1} alignItems={"center"} justifyContent={"space-between"}>
                        <Stack direction={"row"} gap={1} alignItems={"center"}>
                            <Avatar />
                            <Stack>
                                <Typography fontSize={18}>{e.name}</Typography>
                                <Typography color="text.secondary" fontSize={12}>{e.email}</Typography>
                            </Stack>
                        </Stack>
                        <Stack>
                            <Button LinkComponent={Link} href={`/users/${e.id}`} startIcon={<Pen size={18} />} size="small">Sunting</Button>
                        </Stack>
                    </Stack>
                ))}
            </Stack>
        </Stack>
    )
}