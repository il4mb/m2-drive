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
    Drawer,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@mui/material";
import {
    CirclePlus,
    Plus,
    Save,
    ShieldUser,
    X,
    Edit,
    CheckCircle,
    Users,
    KeyRound
} from "lucide-react";
import { motion } from "motion/react";
import { ChangeEvent, useEffect, useState } from "react";
import TransferList from "@/components/ui/TransferList";
import { PERMISSION_LIST, SYSTEM_ROLES } from "@/permission";
import Role from "@/entities/Role";
import _, { isEqual } from "lodash";
import useRoles from "@/hooks/useRoles";
import { invokeFunction } from "@/libs/websocket/invokeFunction";
import { enqueueSnackbar } from "notistack";
import CloseSnackbar from "@/components/ui/CloseSnackbar";
import { useActionPending } from "@/hooks/useActionPending";
import { useMyPermission } from "@/hooks/useMyPermission";
import RoleItem from "./RoleItem";
import ActionView from "@/components/navigation/ActionView";
import { useActionsProvider } from "@/components/navigation/ActionsProvider";

export default function RoleManager() {

    const { addAction } = useActionsProvider();
    const canManageRole = useMyPermission("can-manage-role");
    const SYSTEM_ROLES_NAME = SYSTEM_ROLES.map(e => e.id);
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [abilities, setAbilities] = useState<string[]>([]);
    const roles = useRoles();

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [copiedRole, setCopiedRole] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const isValid = Boolean(name.length > 3 && label.length > 3 && abilities.length > 0 && !isEqual(selectedRole?.abilities, abilities));

    const [loadingSave, handleSaveRole] = useActionPending(async () => {
        try {

            if (!canManageRole) throw new Error("Kamu tidak punya izin untuk memodifikasi role!");
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

    const [loadingDelete, handleDeleteRole] = useActionPending(async (role: Role) => {
        try {

            if (!canManageRole) throw new Error("Kamu tidak punya izin untuk memodifikasi role!");
            const result = await invokeFunction("deleteRole", { name: role.id });
            if (!result.success) throw new Error(result.error);

            enqueueSnackbar(
                "Berhasil menghapus role",
                {
                    variant: "success",
                    action: CloseSnackbar
                }
            );
            setDeleteConfirmOpen(false);
            setRoleToDelete(null);
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

    const handleDeleteClick = (role: Role) => {
        setRoleToDelete(role);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (roleToDelete) {
            handleDeleteRole(roleToDelete);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false);
        setRoleToDelete(null);
    };


    useEffect(() => {
        return addAction("add-role", {
            component: () => (
                <Button
                    onClick={handleToggle}
                    size="large"
                    startIcon={<Plus size={20} />}
                    variant="contained">
                    Tambah Role
                </Button>
            )
        })
    }, []);

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
                        <ActionView minWidth={"md"} id={"add-role"} />
                    </Stack>
                </CardContent>
            </Card>

            {!canManageRole && (
                <Alert severity="warning" variant="outlined">
                    Kamu dalam mode <strong>Read Only.</strong>
                </Alert>
            )}

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
                            <RoleItem
                                role={role}
                                selected={selectedRole}
                                loading={isBusy}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicateRole}
                                onDelete={handleDeleteClick} />
                        </motion.div>
                    ))}
                </Stack>
            </Stack>

            {/* Drawer for Add/Edit Form */}
            <Drawer
                anchor="right"
                open={open}
                onClose={closeEdit}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: { xs: '100%', sm: '80%', md: '60%' },
                        overflowY: 'auto'
                    }
                }}>
                <Stack height="100%">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" p={2}>
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
                        <IconButton onClick={closeEdit}>
                            <X size={20} />
                        </IconButton>
                    </Stack>

                    <Stack flex={1} overflow="auto">
                        <Stack p={2} spacing={3}>
                            <Stack spacing={2} overflow={"visible"} pt={1}>
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
                                    maxHeight={450}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {abilities.length} izin dipilih
                                </Typography>
                            </Stack>
                        </Stack>
                    </Stack>

                    <Stack direction={"row"} spacing={2} justifyContent={"flex-end"} mt="auto" p={2}>
                        <Button
                            variant="outlined"
                            onClick={closeEdit}
                            disabled={isBusy}>
                            Batal
                        </Button>
                        <Button
                            disabled={!canManageRole || !isValid}
                            loading={isBusy}
                            onClick={handleSaveRole}
                            variant="contained"
                            startIcon={<Save size={18} />}
                            size="large">
                            {editMode ? "Update Role" : "Simpan Role"}
                        </Button>
                    </Stack>
                </Stack>
            </Drawer>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={handleDeleteCancel}
                maxWidth="sm"
                fullWidth>
                <DialogTitle>
                    Konfirmasi Hapus Role
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Apakah Anda yakin ingin menghapus role "{roleToDelete?.label}"?
                        Tindakan ini tidak dapat dibatalkan.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} disabled={loadingDelete}>
                        Batal
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        loading={loadingDelete}>
                        Hapus
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}