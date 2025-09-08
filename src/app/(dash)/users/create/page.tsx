'use client'

import Container from "@/components/Container";
import { useCheckMyPermission } from "@/components/context/CurrentUserAbilitiesProvider";
import useRequest from "@/hooks/useRequest";
import useRoles from "@/hooks/useRoles";
import RequestError from "@/components/RequestError";
import AvatarPicker from "@/components/ui/AvatarPicker";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import PasswordField from "@/components/ui/PasswordField";
import { isEmailValid } from "@/libs/validator";
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { ChevronLeft, User, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { enqueueSnackbar } from "notistack";
import { useState } from "react";
import StickyHeader from "@/components/navigation/StickyHeader";
import { addUser } from "@/actions/user";

export default function page() {

    const checkPermission = useCheckMyPermission();
    const canAddUser = checkPermission("can-add-user");
    const roles = useRoles();
    const [enterPw, setEnterPw] = useState(false);

    const [avatar, setAvatar] = useState<File | null>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');

    const request = useRequest({
        action: addUser,
        params: { name, email, role, avatar },
        validator({ name, email, role }) {
            const nameValid = name.trim().length >= 3 && name.trim().length <= 64;
            const emailValid = isEmailValid(email) && email.length >= 6 && email.length <= 64;
            const roleValid = !!role && roles.some(r => r.id === role);

            let passwordValid = true;
            if (enterPw) {
                passwordValid = password.length >= 8 && password.length <= 64;
            }

            return nameValid && emailValid && roleValid && passwordValid;
        },
        onSuccess() {
            setAvatar(null);
            setName('');
            setEmail("");
            setRole("");
            setPassword("");
            setEnterPw(false);
            enqueueSnackbar('Pengguna berhasil ditambahkan', {
                variant: 'success',
                action: CloseSnackbar

            })
        },
    });

    return (
        <Container>
            <StickyHeader>
                <Stack direction={"row"} gap={1} alignItems={"center"}>
                    <Tooltip title={"Kembali"} sx={{ mr: 1 }} arrow>
                        <IconButton LinkComponent={Link} href="/users">
                            <ChevronLeft size={18} />
                        </IconButton>
                    </Tooltip>
                    <UserPlus size={28} />
                    <Typography fontSize={22} fontWeight={600}>
                        Tambah Pengguna
                    </Typography>
                </Stack>
            </StickyHeader>

            <Stack component={Paper} borderRadius={2} boxShadow={2}>

                <Stack gap={2} p={[2, 2, 4]}>

                    <RequestError
                        request={request}
                        closable />

                    {!canAddUser && (
                        <Alert severity="warning" sx={{ mb: 4 }} variant="outlined">
                            <AlertTitle>Kesalahan Wewenang</AlertTitle>
                            Kamu tidak memiliki wewenang untuk menambah pengguna!
                        </Alert>
                    )}

                    <AvatarPicker
                        disabled={!canAddUser || request.pending}
                        value={avatar}
                        onChange={setAvatar}
                        size={{ width: 100, height: 100 }}>
                        <User />
                    </AvatarPicker>

                    <Stack>
                        <TextField
                            disabled={!canAddUser || request.pending}
                            label="Nama"
                            value={name}
                            onChange={e => {
                                const value = e.target.value.trim();
                                if (value.length > 64) return;
                                setName(e.target.value);
                            }} />
                        <Typography component={"small"} fontSize={12} color="text.secondary">
                            {name.length} | min 3, max 64
                        </Typography>
                    </Stack>

                    <Stack>
                        <TextField
                            disabled={!canAddUser || request.pending}
                            type="email"
                            label="Alamat Surel"
                            value={email}
                            onChange={e => {
                                const value = e.target.value.trim().toLowerCase();
                                if (value.length > 64) return;
                                setEmail(value);
                            }} />
                        <Typography component={"small"} fontSize={12} color="text.secondary">
                            {email.length} | min 6, max 64
                        </Typography>
                    </Stack>

                    <TextField
                        disabled={!canAddUser || request.pending}
                        label="Jabatan"
                        placeholder="Pilih Jabatan Pengguna"
                        value={role}
                        onChange={e => setRole(e.target.value)} select>
                        {roles.map((role, i) => (
                            <MenuItem key={i} value={role.id}>
                                {role.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={!canAddUser || request.pending}
                                    checked={enterPw}
                                    onChange={e => setEnterPw(e.target.checked)} />
                            }
                            label={"Buat Kata Sandi?"} />
                        <AnimatePresence>
                            {enterPw && (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 10, opacity: 0 }}>
                                    <PasswordField
                                        disabled={!canAddUser || request.pending}
                                        value={password}
                                        onChange={(e) => {
                                            if (e.length > 64) return;
                                            setPassword(e)
                                        }}
                                        label="Buat Kata Sandi Baru"
                                        progressable showable />
                                    <Typography component={"small"} fontSize={12} color="text.secondary">
                                        {password.length} | min 8, max 64
                                    </Typography>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Stack>
                    {canAddUser && (
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
                    )}
                </Stack>
            </Stack>
        </Container>
    )
}