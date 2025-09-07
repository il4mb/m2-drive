'use client';

import Container from '@/components/Container';
import { useCheckMyPermission } from '@/components/context/CurrentUserAbilitiesProvider';
import useRoles from '@/hooks/useRoles';
import AvatarPicker from '@/components/ui/AvatarPicker';
import PasswordField from '@/components/ui/PasswordField';
import { isEmailValid } from '@/libs/validator';
import {
    Alert,
    AlertTitle,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { ChevronLeft, Save, UserIcon, UserPen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import useUser from '@/hooks/useUser';
import { useUserUpdate } from '@/hooks/useUserUpdate';
import { updateUser } from '@/actions/user';

export default function Page() {
    const checkPermission = useCheckMyPermission();
    const canEditUser = checkPermission('can-edit-user');

    const roles = useRoles();
    const { uid } = useParams<{ uid: string }>();
    const { user, loading: getLoading } = useUser(uid);
    const { loading: updateLoading } = useUserUpdate(); // jika hook ini memang ada

    const [changePw, setChangePw] = useState(false);
    const [avatar, setAvatar] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');

    const [submitError, setSubmitError] = useState<string | null>(null);

    const isBusy = getLoading || updateLoading;

    // Validation flags
    const nameValid = name.trim().length >= 3 && name.trim().length <= 64;
    const emailValid = isEmailValid(email) && email.length >= 6 && email.length <= 64;
    const roleValid = !!role && roles.some((r) => r.name === role);
    const passwordValid = !changePw || (password.length >= 8 && password.length <= 64);

    const isChanged = useMemo(
        () =>
            Boolean(
                avatar ||
                user?.name !== name ||
                user?.email !== email ||
                user?.meta?.role !== role ||
                (changePw && password.length >= 8),
            ),
        [avatar, changePw, email, name, password, role, user],
    );

    const isValid = nameValid && emailValid && roleValid && passwordValid && isChanged;

    // Submit handler
    const handleSubmit = useCallback(async () => {
        if (!isValid) return;
        try {
            setSubmitError(null);
            await updateUser({
                uid,
                role,
                name,
                email,
                avatar,
                ...(changePw && { password }),
            });
        } catch (err: any) {
            console.error('Failed to update user:', err);
            setSubmitError(err?.message || 'Gagal menyimpan perubahan pengguna.');
        }
    }, [avatar, changePw, email, isValid, name, password, role, uid]);

    // Fill form from user
    useEffect(() => {
        if (user) {
            setName(user.name ?? '');
            setEmail(user.email ?? '');
            setRole(user.meta?.role ?? 'user');
        }
    }, [user]);

    return (
        <Container>
            {/* Header */}
            <Stack
                component={Paper}
                p={2}
                mb={2}
                position="sticky"
                top={0}
                zIndex={10}
                boxShadow={2}
                borderRadius={2}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" gap={1} alignItems="center">
                        <Tooltip title="Kembali" sx={{ mr: 1 }} arrow>
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

            {/* Form */}
            <Stack component={Paper} borderRadius={2} boxShadow={2}>
                <Stack gap={2} p={[2, 2, 4]}>
                    {/* Permission warning */}
                    {!canEditUser && (
                        <Alert severity="warning" variant="outlined">
                            <AlertTitle>Kesalahan Wewenang</AlertTitle>
                            Kamu tidak memiliki wewenang untuk menyunting pengguna!
                        </Alert>
                    )}

                    {/* Submit error */}
                    {submitError && (
                        <Alert severity="error" variant="outlined">
                            <AlertTitle>Gagal</AlertTitle>
                            {submitError}
                        </Alert>
                    )}

                    {/* Avatar */}
                    <AvatarPicker
                        disabled={!canEditUser || isBusy}
                        src={user?.meta?.avatar}
                        size={{ width: 100, height: 100 }}
                        value={avatar}
                        onChange={setAvatar}>
                        <UserIcon />
                    </AvatarPicker>

                    {/* Name */}
                    <Stack>
                        <TextField
                            label="Nama"
                            value={name}
                            disabled={!canEditUser || isBusy}
                            error={!nameValid}
                            onChange={(e) => {
                                const value = e.target.value.trim();
                                if (value.length <= 64) setName(value);
                            }}
                        />
                        <Typography variant='caption' color='text.secondary'>
                            {!nameValid ? 'Nama harus 3–64 karakter.' : `${name.length} karakter`}
                        </Typography>
                    </Stack>

                    {/* Email */}
                    <Stack>
                        <TextField
                            type="email"
                            label="Alamat Surel"
                            value={email}
                            disabled={!canEditUser || isBusy}
                            error={!emailValid}
                            onChange={(e) => {
                                const value = e.target.value.trim().toLowerCase();
                                if (value.length <= 64) setEmail(value);
                            }}
                        />
                        <Typography variant='caption' color='text.secondary'>
                            {!emailValid ? 'Email tidak valid atau panjang salah.' : `${email.length} karakter`}
                        </Typography>
                    </Stack>


                    {/* Role */}
                    <TextField
                        label="Jabatan"
                        placeholder="Pilih Jabatan Pengguna"
                        value={role}
                        disabled={!canEditUser || isBusy}
                        error={!roleValid}
                        onChange={(e) => setRole(e.target.value)}
                        select>
                        {roles.map((r) => (
                            <MenuItem key={r.name} value={r.name}>
                                {r.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Password change */}
                    <Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={!canEditUser || isBusy}
                                    checked={changePw}
                                    onChange={(e) => setChangePw(e.target.checked)}
                                />
                            }
                            label="Ubah Kata Sandi?"
                        />
                        <AnimatePresence>
                            {changePw && (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 10, opacity: 0 }}>
                                    <PasswordField
                                        disabled={!canEditUser || isBusy}
                                        value={password}
                                        onChange={(val) => {
                                            if (val.length <= 64) setPassword(val);
                                        }}
                                        label="Buat Kata Sandi Baru"
                                        progressable
                                        showable
                                    />
                                    <Typography variant='caption' color='text.secondary'>
                                        {
                                            !passwordValid
                                                ? 'Kata sandi harus 8-64 karakter.'
                                                : `${password.length} karakter`
                                        }
                                    </Typography>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Stack>

                    {/* Save button */}
                    {canEditUser && (
                        <Button
                            disabled={!isValid || isBusy}
                            onClick={handleSubmit}
                            variant="contained"
                            sx={{ alignSelf: 'flex-end', mt: 4 }}
                            startIcon={<Save size={16} />}>
                            Simpan
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Container>
    );
}
