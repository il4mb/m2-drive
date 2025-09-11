'use client'

import Container from "@/components/Container";
import useRoles from "@/hooks/useRoles";
import AvatarPicker from "@/components/ui/AvatarPicker";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import PasswordField from "@/components/ui/PasswordField";
import { isEmailValid } from "@/libs/validator";
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { ChevronLeft, User, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { enqueueSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import StickyHeader from "@/components/navigation/StickyHeader";
import { uploadAvatar } from "@/actions/user";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { useMyPermission } from "@/hooks/useMyPermission";
import { useRouter } from "next/navigation";
import { useActionsProvider } from "@/components/navigation/ActionsProvider";
import PermissionSuspense from "@/components/PermissionSuspense";

export default function page() {

    const { addAction } = useActionsProvider();
    const router = useRouter();
    const canAddUser = useMyPermission("can-add-user");
    const roles = useRoles();
    const [enterPw, setEnterPw] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<File | null>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [redirect, setRedirect] = useState(true);

    const isValid = useMemo(() => {
        const nameValid = name.trim().length >= 3 && name.trim().length <= 64;
        const emailValid = isEmailValid(email) && email.length >= 6 && email.length <= 64;
        const roleValid = !!role && roles.some(r => r.id === role);

        let passwordValid = true;
        if (enterPw) {
            passwordValid = password.length >= 8 && password.length <= 64;
        }

        return nameValid && emailValid && roleValid && passwordValid;
    }, [name, email, role, password]);

    const handleAddUser = async () => {

        if (loading) return;
        setLoading(true);
        setError(null);

        try {

            const addResult = await invokeFunction("addUser", { name, email, role, password });
            if (!addResult.success || !addResult.data?.id) throw new Error(addResult.error || "Unknown Error");
            if (avatar) {
                const avatarResult = await uploadAvatar(addResult.data?.id, avatar);
                if (avatarResult?.data?.avatar) {
                    await invokeFunction("updateUser", {
                        userId: addResult.data.id,
                        avatar: avatarResult.data.avatar,
                        name: addResult.data.name,
                        email: addResult.data.email,
                        role: addResult.data.meta.role
                    });
                }
            }
            enqueueSnackbar("Berhasil menambahkan user", {
                variant: "success",
                action: CloseSnackbar
            });

            if (redirect) {
                router.push(`/users/${addResult.data.id}/edit`);
            } else {
                setName('');
                setEmail('');
                setRole('');
                setPassword('');
                setLoading(false);
            }

        } catch (error: any) {

            setError(error.message);
            enqueueSnackbar(error.message || "Unknown Error", {
                variant: "error",
                action: CloseSnackbar
            });
            setLoading(false);
        }
    }


    useEffect(() => {
        return addAction("redirect", {
            component: () => (
                <FormControlLabel
                    label={"Redirect"}
                    control={<Checkbox checked={redirect}
                        onChange={(e) => setRedirect(e.target.checked)} />} />
            )
        })
    }, [redirect])


    return (
        <PermissionSuspense permission={"can-add-user"}>
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

                        {error && (
                            <Alert severity={"error"} sx={{ mb: 2 }} onClose={() => setError(null)}>
                                <AlertTitle>Failed</AlertTitle>
                                {error}
                            </Alert>
                        )}

                        {!canAddUser && (
                            <Alert severity="warning" sx={{ mb: 4 }} variant="outlined">
                                <AlertTitle>Kesalahan Wewenang</AlertTitle>
                                Kamu tidak memiliki wewenang untuk menambah pengguna!
                            </Alert>
                        )}

                        <AvatarPicker
                            disabled={!canAddUser || loading}
                            value={avatar}
                            onChange={setAvatar}
                            size={{ width: 100, height: 100 }}>
                            <User />
                        </AvatarPicker>

                        <Stack>
                            <TextField
                                disabled={!canAddUser || loading}
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
                                disabled={!canAddUser || loading}
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
                            disabled={!canAddUser || loading}
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
                                        disabled={!canAddUser || loading}
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
                                            disabled={!canAddUser || loading}
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
                                loading={loading}
                                disabled={!isValid}
                                onClick={handleAddUser}
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
        </PermissionSuspense>
    )
}