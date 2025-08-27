'use client'

import { getUser } from "@/actions/manage-users";
import useRequest from "@/components/hooks/useRequest";
import RequestError from "@/components/RequestError";
import User from "@/entity/User";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Save, UserPen } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function page() {

    const { uId } = useParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');

    const request = useRequest({
        action: getUser,
        params: { uId },
        onSuccess(result) {
            const user = result.data?.user;
            setName(user.name || "");
            setEmail(user.email || '');
            setRole(user.meta.role || "user");
        },
    })

    useEffect(() => {
        request.send();
    }, [uId]);


    return (
        <Stack m={2} maxWidth={800} mx={"auto"} width={"100%"}>
            <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <UserPen size={28} />
                    <Typography fontSize={22} fontWeight={600}>
                        Sunting Pengguna
                    </Typography>
                </Stack>
            </Stack>

            <Stack spacing={2} mt={2} p={[2, 2, 4]}>
                <RequestError request={request} closable />

                <TextField
                    label="Nama"
                    value={name}
                    onChange={e => setName(e.target.value)} />

                <TextField
                    type="email"
                    label="Alamat Surel"
                    value={email}
                    onChange={e => setEmail(e.target.value)} />

                <TextField
                    label="Jabatan"
                    value={role}
                    onChange={e => setRole(e.target.value)} select>
                    <MenuItem value={"user"}>
                        Pengguna Biasa
                    </MenuItem>
                    <MenuItem value={"guru"}>
                        Guru
                    </MenuItem>
                    <MenuItem value={"admin"}>
                        Admin
                    </MenuItem>
                </TextField>

                <Button
                    loading={request.pending}
                    disabled={!request.isValid}
                    onClick={request.send}
                    variant="contained"
                    sx={{
                        alignSelf: "flex-end",
                        justifySelf: "flex-end"
                    }}
                    startIcon={<Save size={16} />}>
                    Simpan
                </Button>
            </Stack>
        </Stack>
    );
}
