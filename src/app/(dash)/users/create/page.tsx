'use client'

import { handleAddUser } from "@/actions/manage-users";
import useRequest from "@/components/hooks/useRequest";
import RequestError from "@/components/RequestError";
import { isEmailValid } from "@/libs/validator";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { UserPlus } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

export default function page() {

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');

    const request = useRequest({
        action: handleAddUser,
        params: { name, email, role },
        validator({ name, email, role }) {
            return Boolean(isEmailValid(email) && name && role);
            <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <UserPlus size={28} />
                    <Typography fontSize={22} fontWeight={600}>
                        Tambah Pengguna
                    </Typography>
                </Stack>
            </Stack>
},
        onSuccess() {
            setName('');
            setEmail("");
            setRole("user");
            enqueueSnackbar("Berhasil tambah pengguna!", { variant: "success" });
        },
    });

    return (
        <Stack m={2} maxWidth={800} mx={"auto"} width={"100%"}>
        
            <Stack spacing={2} mt={2} p={[2, 2, 4]}>
                <RequestError request={request} closable />

                <TextField label="Nama" value={name} onChange={e => setName(e.target.value)} />
                <TextField type="email" label="Alamat Surel" value={email} onChange={e => setEmail(e.target.value)} />
                <TextField label="Jabatan" value={role} onChange={e => setRole(e.target.value)} select>
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
                    startIcon={<UserPlus size={16} />}>
                    Tambahkan
                </Button>
            </Stack>
        </Stack>
    )
}