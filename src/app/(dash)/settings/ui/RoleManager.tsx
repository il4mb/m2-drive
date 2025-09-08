import {
    Button,
    Chip,
    Stack,
    TextField,
    Typography,
    Box,
    IconButton,
    Card,
    CardContent,
    Alert,
    Tooltip} from "@mui/material";
import {
    CirclePlus,
    Plus,
    Save,
    ShieldUser,
    X,
    Edit,
    Trash2,
    Copy,
    CheckCircle,
    AlertCircle,
    Users,
    KeyRound
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChangeEvent, useState } from "react";
import TransferList from "./TransferList";
import { PERMISSION_LIST, SYSTEM_ROLES } from "@/permission";
import Role from "@/entity/Role";
import _ from "lodash";
import useRoles from "@/hooks/useRoles";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import { useActionPending } from "@/hooks/useActionPending";
import ConfirmationDialog from "@/components/ui/dialog/ConfirmationDialog";

export default function RoleManager() {

    const SYSTEM_ROLES_NAME = SYSTEM_ROLES.map(e => e.id);
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [abilities, setAbilities] = useState<string[]>([]);
    const roles = useRoles();

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [copiedRole, setCopiedRole] = useState<string | null>(null);

    const isValid = Boolean(name.length > 3 && label.length > 3 && abilities.length > 0);

    const [loadingSave, handleSaveRole] = useActionPending(async () => {
        try {
            const result = await invokeFunction("saveRole", { name, label, abilities });
            if (!result.success) throw new Error(result.error);

            closeEdit();
            enqueueSnackbar(
                `Berhasil ${editMode ? 'mengupdate' : 'menambahkan'} role`,
                {
                    variant: "success",
                    action: CloseSnackbar
                }
            );
        } catch (error: any) {
            enqueueSnackbar(
                error.message || "Terjadi kesalahan",
                {
                    variant: "error",
                    action: CloseSnackbar
                }
            );
        }
    });

    const [loadingDelete, handleDeleteRole] = useActionPending(async (id: string) => {
        try {
            const result = await invokeFunction("deleteRole", { name: id });
            if (!result.success) throw new Error(result.error);

            enqueueSnackbar(
                "Berhasil menghapus role",
                {
                    variant: "success",
                    action: CloseSnackbar
                }
            );
        } catch (error: any) {
            enqueueSnackbar(
                error.message || "Terjadi kesalahan",
                {
                    variant: "error",
                    action: CloseSnackbar
                }
            );
        }
    });

    const handleDuplicateRole = (role: Role) => {
        setSelectedRole(role);
        setName(`${role.id}-copy`);
        setLabel(`${role.label} (Salinan)`);
        setAbilities([...role.abilities]);
        setEditMode(false);
        setOpen(true);
        setCopiedRole(role.id);

        setTimeout(() => setCopiedRole(null), 2000);
    };

    const isBusy = loadingSave || loadingDelete;

    const closeEdit = () => {
        setName('');
        setLabel('');
        setAbilities([]);
        setOpen(false);
        setEditMode(false);
        setSelectedRole(null);
        setCopiedRole(null);
    };

    const handleToggle = () => {
        if (open) {
            closeEdit();
        } else {
            setOpen(true);
        }
    };

    const handleEdit = (role: Role) => {
        if (SYSTEM_ROLES_NAME.includes(role.id) && !(role as any).editable) return;

        setSelectedRole(role);
        setName(role.id);
        setLabel(role.label);
        setAbilities(role.abilities);
        setEditMode(true);
        setOpen(true);
    };

    const handleSetLabel = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLabel(value);
        if (!editMode) {
            const generatedName = value
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z-]+/g, '')
                .trim();
            setName(generatedName);
        }
    };

    const handleSetName = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value.trim().replace(/\s+/g, '-').replace(/[^a-z-]+/g, '').trim());
    };

    const getRoleUsageCount = (roleId: string) => {
        // Mock usage count - replace with actual data
        return Math.floor(Math.random() * 50);
    };

    return (
        <Stack spacing={3}>
            {/* Header */}
            <Card
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 3
                }}>
                <CardContent>
                    <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
                        <Stack direction={"row"} spacing={2} alignItems={"center"}>
                            <Box sx={{
                                p: 1.5,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <ShieldUser size={32} />
                            </Box>
                            <Stack>
                                <Typography variant="h4" fontWeight="bold">
                                    Role Manager
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Kelola peran dan izin pengguna sistem
                                </Typography>
                            </Stack>
                        </Stack>
                        <Button
                            onClick={handleToggle}
                            size="large"
                            startIcon={open ? <X size={20} /> : <Plus size={20} />}
                            variant="contained">
                            {open ? "Batal" : "Tambah Role"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Add/Edit Form */}
            <AnimatePresence mode="wait">
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card sx={{ borderRadius: 3, mb: 3 }}>
                            <CardContent>
                                <Stack spacing={3}>
                                    <Stack direction={"row"} spacing={2} alignItems={"center"}>
                                        <Box sx={{
                                            p: 1,
                                            bgcolor: 'primary.main',
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {editMode ? <Edit size={20} /> : <CirclePlus size={20} />}
                                        </Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            {editMode ? "Edit Role" : "Tambah Role Baru"}
                                        </Typography>
                                        {copiedRole && (
                                            <Chip
                                                icon={<CheckCircle size={16} />}
                                                label="Disalin"
                                                color="success"
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Stack>

                                    <Stack spacing={2}>
                                        <TextField
                                            value={label}
                                            onChange={handleSetLabel}
                                            label="Nama Role"
                                            placeholder="Contoh: Administrator Sekolah"
                                            autoFocus
                                            autoCapitalize="on"
                                            disabled={isBusy}
                                            fullWidth
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {label.length} / 3-50 karakter
                                        </Typography>
                                    </Stack>

                                    <Stack spacing={2}>
                                        <TextField
                                            value={name}
                                            onChange={handleSetName}
                                            label="ID Role"
                                            placeholder="Contoh: admin-sekolah"
                                            disabled={editMode || isBusy}
                                            fullWidth
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {name.length} / 3-50 karakter - ID tidak dapat diubah setelah dibuat
                                        </Typography>
                                    </Stack>

                                    <Stack spacing={2}>
                                        <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                            <KeyRound size={20} />
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                Izin & Kemampuan
                                            </Typography>
                                        </Stack>
                                        <TransferList
                                            defineList={PERMISSION_LIST as any}
                                            items={abilities}
                                            onChange={setAbilities}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {abilities.length} izin dipilih
                                        </Typography>
                                    </Stack>

                                    <Stack direction={"row"} spacing={2} justifyContent={"flex-end"}>
                                        <Button
                                            variant="outlined"
                                            onClick={closeEdit}
                                            disabled={isBusy}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            disabled={!isValid}
                                            loading={isBusy}
                                            onClick={handleSaveRole}
                                            variant="contained"
                                            startIcon={<Save size={18} />}
                                            size="large"
                                        >
                                            {editMode ? "Update Role" : "Simpan Role"}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Roles List */}
            <Stack spacing={2}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    Daftar Role ({roles.length})
                </Typography>

                {roles.length === 0 && (
                    <Alert severity="info" icon={<Users />}>
                        Belum ada role yang dibuat. Klik "Tambah Role" untuk membuat role pertama.
                    </Alert>
                )}

                <Stack spacing={2}>
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}>
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    border: selectedRole?.id === role.id ? '2px solid' : '1px solid',
                                    borderColor: selectedRole?.id === role.id ? 'primary.main' : 'divider',
                                    transition: 'all 0.2s ease'
                                }}>
                                <CardContent>
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={3}
                                        alignItems={{ md: 'center' }}
                                        justifyContent="space-between">
                                        {/* Role Info */}
                                        <Stack spacing={1} flex={1}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {role.label}
                                                </Typography>
                                                {SYSTEM_ROLES_NAME.includes(role.id) && (
                                                    <Chip
                                                        color="primary"
                                                        label="System"
                                                        size="small"
                                                        variant="filled"
                                                    />
                                                )}
                                                {/* <Chip
                                                    color="info"
                                                    label={`${getRoleUsageCount(role.id)} pengguna`}
                                                    size="small"
                                                    variant="outlined"
                                                /> */}
                                            </Stack>

                                            <Typography variant="body2" color="text.secondary">
                                                ID: {role.id}
                                            </Typography>

                                            {/* Abilities */}
                                            <Stack spacing={1} mt={1}>
                                                <Typography variant="caption" fontWeight="medium">
                                                    Izin ({role.abilities.length}):
                                                </Typography>
                                                <Stack direction="row" gap={1} flexWrap="wrap">
                                                    {role.abilities.slice(0, 5).map(ability => (
                                                        <Chip
                                                            key={ability}
                                                            label={ability}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontSize: 11, height: 24 }}
                                                        />
                                                    ))}
                                                    {role.abilities.length > 5 && (
                                                        <Chip
                                                            label={`+${role.abilities.length - 5} lebih`}
                                                            size="small"
                                                            variant="filled"
                                                            sx={{ fontSize: 11, height: 24 }}
                                                        />
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Stack>

                                        {/* Actions */}
                                        <Stack
                                            direction={{ xs: 'row', md: 'column' }}
                                            spacing={1}
                                            alignItems={{ xs: 'center', md: 'flex-end' }}>
                                            {!SYSTEM_ROLES_NAME.includes(role.id) ? (
                                                <>
                                                    <Tooltip title="Edit role">
                                                        <IconButton
                                                            onClick={() => handleEdit(role)}
                                                            disabled={isBusy}
                                                            color="primary">
                                                            <Edit size={18} />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title="Duplikat role">
                                                        <IconButton
                                                            onClick={() => handleDuplicateRole(role)}
                                                            disabled={isBusy}
                                                            color="info">
                                                            <Copy size={18} />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <ConfirmationDialog
                                                        triggerElement={
                                                            <Tooltip title="Hapus role">
                                                                <IconButton
                                                                    disabled={isBusy}
                                                                    color="error">
                                                                    <Trash2 size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        }
                                                        onConfirm={async () => handleDeleteRole(role.id)}
                                                        title="Hapus Role?"
                                                        message={
                                                            <Stack spacing={1}>
                                                                <Typography>
                                                                    Apakah Anda yakin ingin menghapus role <strong>{role.label}</strong>?
                                                                </Typography>
                                                                <Alert severity="warning" icon={<AlertCircle size={18} />}>
                                                                    Tindakan ini akan mempengaruhi pengguna dan tidak dapat dibatalkan.
                                                                </Alert>
                                                            </Stack>
                                                        }
                                                    />
                                                </>
                                            ) : (role as any).editable && (
                                                <Tooltip title="Edit role system">
                                                    <IconButton
                                                        onClick={() => handleEdit(role)}
                                                        disabled={isBusy}
                                                        color="primary">
                                                        <Edit size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </Stack>
            </Stack>
        </Stack>
    );
}