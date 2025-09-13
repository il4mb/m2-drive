'use client';

import Container from '@/components/Container';
import { useCheckMyPermissionState } from '@/components/context/CurrentUserAbilitiesProvider';
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
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Key, Save, UserIcon, UserPen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { uploadAvatar } from '@/actions/user';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import StickyHeader from '@/components/navigation/StickyHeader';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';

export default function page() {

    const checkPermission = useCheckMyPermissionState();
    const canEditProfile = checkPermission('can-edit-profile');

    const { user, userId } = useCurrentSession();
    const [loading, setLoading] = useState(false);

    const [changePw, setChangePw] = useState(false);
    const [avatar, setAvatar] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [submitError, setSubmitError] = useState<string | null>(null);
    // Validation flags
    const nameValid = name.trim().length >= 3 && name.trim().length <= 64;
    const emailValid = isEmailValid(email) && email.length >= 6 && email.length <= 64;
    const passwordValid = !changePw || (password.length >= 8 && password.length <= 64);

    const isChanged = useMemo(
        () =>
            Boolean(
                avatar ||
                user?.name !== name ||
                user?.email !== email ||
                (changePw && password.length >= 8),
            ),
        [avatar, changePw, email, name, password, user],
    );

    const isValid = nameValid && emailValid && passwordValid && isChanged;

    // Submit handler
    const handleSubmit = useCallback(async () => {
        if (!isValid || loading || !userId) return;
        setLoading(true)
        try {
            setSubmitError(null);

            let avatarUrl: string | null = null;
            if (avatar) {
                const uploadAvatarResult = await uploadAvatar(userId, avatar);
                if (!uploadAvatarResult?.status) {
                    throw new Error(uploadAvatarResult?.message || "Unknown Error");
                }
                avatarUrl = uploadAvatarResult.data?.avatar || null;
            }

            const result = await invokeFunction("updateUser", {
                userId,
                name, email, avatar: avatarUrl,
                ...(changePw && { password })
            })
            if (!result.success) throw new Error(result.error);
            enqueueSnackbar("Profile berhasil diperbarui!", {
                variant: "success",
                action: CloseSnackbar
            });

        } catch (err: any) {
            console.error('Failed to update user:', err);
            setSubmitError(err?.message || 'Gagal menyimpan perubahan pengguna.');
        } finally {
            setLoading(false)
        }
    }, [avatar, changePw, email, isValid, name, password, userId]);


    // Fill form from user
    useEffect(() => {
        if (user) {
            setName(user.name ?? '');
            setEmail(user.email ?? '');
        }
    }, [user]);

    return (
        <Container>
            {/* Header */}
            <StickyHeader canGoBack>
                <Stack direction="row" gap={1} alignItems="center">
                    <UserPen size={28} />
                    <Typography fontSize={22} fontWeight={600}>
                        Sunting Profile
                    </Typography>
                </Stack>
            </StickyHeader>

            {/* Form */}
            <Stack component={Paper} borderRadius={2} boxShadow={2}>
                <Stack gap={2} p={[2, 2, 4]}>
                    {/* Permission warning */}
                    {!canEditProfile && (
                        <Alert severity="warning" variant="outlined" icon={<Key size={18} />}>
                            Kamu tidak izin untuk menyunting profile!
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
                        disabled={!canEditProfile || loading}
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
                            disabled={!canEditProfile || loading}
                            error={!nameValid}
                            onChange={(e) => {
                                const value = e.target.value.trim();
                                if (value.length <= 64) setName(e.target.value);
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
                            disabled={!canEditProfile || loading}
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

                    {/* Password change */}
                    <Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={!canEditProfile || loading}
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
                                        disabled={!canEditProfile || loading}
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
                    {canEditProfile && (
                        <Button
                            disabled={!isValid || loading}
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
