'use client'

import { getUser, handleUpdateUser } from "@/actions/manage-users";
import Container from "@/components/Container";
import { useCheckMyPermission } from "@/components/context/CurrentUserAbilitiesProvider";
import useRequest from "@/hooks/useRequest";
import useRoles from "@/hooks/useRoles";
import RequestError from "@/components/RequestError";
import AvatarPicker from "@/components/ui/AvatarPicker";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import PasswordField from "@/components/ui/PasswordField";
import User from "@/entity/User";
import { isEmailValid } from "@/libs/validator";
import { emitSocket } from "@/socket";
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { ChevronLeft, Save, UserIcon, UserPen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

export default function page() {

    const checkPermission = useCheckMyPermission();
    const canEditUser = checkPermission('can-edit-user');

    const { uid } = useParams<{ uid: string }>();
    const [user, setUser] = useState<User>();

    const roles = useRoles();
    const [changePw, setChangePw] = useState(false);

    const [avatar, setAvatar] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');

    const requestGetUser = useRequest({
        action: getUser,
        params: { uid },
        onSuccess(result) {
            const user = result.data?.user;
            setUser(user);
        },
    });

    const requestUpdate = useRequest({
        action: handleUpdateUser,
        params: { uid, name, email, role, avatar, ...(changePw && { password }) },
        validator({ name, email, role, avatar, password }) {

            const nameValid = name.trim().length >= 3 && name.trim().length <= 64;
            const emailValid = isEmailValid(email) && email.length >= 6 && email.length <= 64;
            const roleValid = !!role && roles.some(r => r.name === role);

            let passwordValid = true;
            if (changePw) {
                passwordValid = (password || '').length >= 8 && (password || '').length <= 64;
            }

            return nameValid && emailValid && roleValid && passwordValid && (
                Boolean(avatar
                    || user?.name != name
                    || user.email != email
                    || user.meta.role != role
                    || (password && password.length >= 8)
                )
            );
        },
        async onSuccess(result) {
            await requestGetUser.send();
            setAvatar(null);
            setPassword('');
            setChangePw(false);
            enqueueSnackbar('Pengguna berhasil diperbarui', {
                variant: 'success',
                action: CloseSnackbar
            });
            emitSocket("update", {
                collection: "user",
                columns: {
                    id: uid
                },
                data: result.data
            });
        },
    })

    useEffect(() => {
        requestGetUser.send();
    }, [uid]);

    useEffect(() => {
        setName(user?.name || "");
        setEmail(user?.email || '');
        setRole(user?.meta.role || '');
    }, [user])


    return (
        <Container>
            <Stack component={Paper} p={2} mb={2} position={"sticky"} top={0} zIndex={10} boxShadow={2} borderRadius={2}>
                <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"}>
                    <Stack direction={"row"} gap={1} alignItems={"center"}>
                        <Tooltip title={"Kembali"} sx={{ mr: 1 }} arrow>
                            <IconButton LinkComponent={Link} href="/users">
                                <ChevronLeft size={18} />
                            </IconButton>
                        </Tooltip>
                        <UserPen size={28} />
                        <Typography fontSize={22} fontWeight={600}>
                            Sunting Pengguna
                        </Typography>
                    </Stack>
                </Stack>
            </Stack>
            <Stack component={Paper} borderRadius={2} boxShadow={2}>
                <Stack gap={2} p={[2, 2, 4]}>

                    {!canEditUser && (
                        <Alert severity="warning" variant="outlined">
                            <AlertTitle>Kesalahan Wewenang</AlertTitle>
                            Kamu tidak memiliki wewenang untuk mensungting pengguna!
                        </Alert>
                    )}

                    <RequestError
                        request={requestGetUser}
                        tryagain />

                    <RequestError
                        request={requestUpdate}
                        closable />

                    <AvatarPicker
                        disabled={!canEditUser || requestUpdate.pending || requestGetUser.pending}
                        src={user?.meta.avatar}
                        size={{ width: 100, height: 100 }}
                        value={avatar} onChange={setAvatar}>
                        <UserIcon />
                    </AvatarPicker>

                    <Stack>
                        <TextField
                            label="Nama"
                            value={name}
                            disabled={!canEditUser || requestUpdate.pending || requestGetUser.pending}
                            onChange={e => {
                                const value = e.target.value.trim();
                                if (value.length > 64) return;
                                setName(value);
                            }} />
                        <Typography component={"small"} fontSize={12} color="text.secondary">
                            {name.length} | min 3, max 64
                        </Typography>
                    </Stack>

                    <Stack>
                        <TextField
                            type="email"
                            label="Alamat Surel"
                            value={email}
                            disabled={!canEditUser || requestUpdate.pending || requestGetUser.pending}
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
                        label="Jabatan"
                        placeholder="Pilih Jabatan Pengguna"
                        value={role}
                        disabled={!canEditUser || requestUpdate.pending || requestGetUser.pending}
                        onChange={e => setRole(e.target.value)} select>
                        {roles.map((role, i) => (
                            <MenuItem key={i} value={role.name}>
                                {role.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={!canEditUser || requestUpdate.pending || requestGetUser.pending}
                                    checked={changePw}
                                    onChange={e => setChangePw(e.target.checked)} />
                            }
                            label={"Ubah Kata Sandi?"} />
                        <AnimatePresence>
                            {changePw && (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 10, opacity: 0 }}>
                                    <PasswordField
                                        disabled={!canEditUser || requestUpdate.pending || requestGetUser.pending}
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


                    {canEditUser && (
                        <Button
                            loading={requestUpdate.pending}
                            disabled={!requestUpdate.isValid}
                            onClick={requestUpdate.send}
                            variant="contained"
                            sx={{
                                alignSelf: "flex-end",
                                justifySelf: "flex-end",
                                mt: 4
                            }}
                            startIcon={<Save size={16} />}>
                            Simpan
                        </Button>
                    )}

                </Stack>
            </Stack>

        </Container>
    );
}
