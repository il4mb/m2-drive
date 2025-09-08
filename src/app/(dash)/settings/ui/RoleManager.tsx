import { Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { CirclePlus, PersonStanding, Plus, Save, ShieldUser, X, Edit, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChangeEvent, useEffect, useState } from "react";
import TransferList from "./TransferList";
import { PERMISSION_LIST, SYSTEM_ROLES } from "@/permission";
import useRequest from "@/hooks/useRequest";
import { saveRole, deleteRole, getAllRole } from "@/actions/manage-role";
import RequestError from "@/components/RequestError";
import Role from "@/entity/Role";
import _ from "lodash";

function mergeRolesDeep(rolesA: any[], rolesB: any[]) {
    const keyedA = _.keyBy(rolesA, "name");
    const keyedB = _.keyBy(rolesB, "name");

    // merge deep per key
    const merged = _.merge({}, keyedA, keyedB);

    return _.values(merged);
}


export default function RoleManager() {

    const SYSTEM_ROLES_NAME = SYSTEM_ROLES.map(e => e.id);
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [abilities, setAbilities] = useState<string[]>([]);
    const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const requestGetRole = useRequest({
        action: getAllRole,
        onSuccess(result) {
            setRoles(mergeRolesDeep(SYSTEM_ROLES, result.data));
        },
    });

    const requestSave = useRequest({
        action: saveRole,
        params: { name, label, abilities },
        validator({ name, label, abilities }) {
            return Boolean(name.length > 3 && label.length > 3 && abilities.length > 0)
        },
        onSuccess() {
            closeEdit();
            requestGetRole.send();
        },
    }, []);


    const requestDelete = useRequest({
        action: deleteRole,
        params: { name: selectedRole?.id || '' },
        validator() {
            return Boolean(selectedRole);
        },
        onSuccess({ data }) {
            setDeleteConfirmOpen(false);
            setSelectedRole(null);
            requestGetRole.send();
        },
    }, [selectedRole]);

    const closeEdit = () => {
        setName('');
        setLabel('');
        setAbilities([]);
        setOpen(false);
        setEditMode(false);
        setSelectedRole(null);
    };

    const handleToggle = () => {
        setOpen(prev => !prev);
        setName('');
        setLabel('');
        setAbilities([]);
        setEditMode(false);
        setSelectedRole(null);
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

    const handleDelete = (role: Role) => {
        if (SYSTEM_ROLES_NAME.includes(role.id)) return;

        setSelectedRole(role);
        setDeleteConfirmOpen(true);
    };


    const handleSave = () => {
        requestSave.send();
    };

    const handleSetLabel = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLabel(value);
        if (!editMode) {
            setName(value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]+/g, '').trim());
        }
    };

    const handleSetName = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value.trim().replace(/\s+/g, '-').replace(/[^a-z-]+/g, '').trim());
    };

    useEffect(() => {
        requestGetRole.send();
    }, []);

    return (
        <Stack>
            <Stack direction={"row"} justifyContent={"space-between"}>
                <Stack direction={"row"} spacing={1}>
                    <ShieldUser />
                    <Typography fontSize={18} fontWeight={900}>Role Manager</Typography>
                </Stack>
                <Button onClick={handleToggle} size="small" startIcon={open ? <X size={16} /> : <Plus size={16} />} variant="contained">
                    {open ? "Batal" : "Tambah Role"}
                </Button>
            </Stack>

            <AnimatePresence>
                {open && (
                    <Stack
                        layoutId="add-form"
                        component={motion.div}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 10, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        gap={2} p={1}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2, px: 3, py: 2, mb: 4 }}>

                        <Stack direction={"row"} spacing={1} alignItems={"center"} mb={2}>
                            <CirclePlus />
                            <Typography fontSize={16} fontWeight={600}>
                                {editMode ? "Edit Role" : "Tambah Role"}
                            </Typography>
                        </Stack>

                        <RequestError request={requestSave} closable sx={{ mb: 2, mt: 0 }} />

                        <Stack>
                            <TextField
                                value={label}
                                onChange={handleSetLabel}
                                label={"Label"}
                                autoFocus
                                autoCapitalize="on"
                                disabled={requestSave.pending} />
                            <Typography component={"small"} fontSize={12} color="text.secondary">
                                {label.length} / 3-50
                            </Typography>
                        </Stack>

                        <Stack>
                            <TextField
                                value={name}
                                onChange={handleSetName}
                                label={"Name"}
                                disabled={editMode || (requestSave.pending)} />
                            <Typography component={"small"} fontSize={12} color="text.secondary">
                                {name.length} - 3/50
                            </Typography>
                        </Stack>

                        <Stack>
                            <Stack direction={"row"} spacing={1} alignItems={"center"} mt={2}>
                                <PersonStanding size={20} />
                                <Typography fontSize={14} fontWeight={600}>
                                    Ability / Kemampuan
                                </Typography>
                            </Stack>
                            <TransferList
                                defineList={PERMISSION_LIST as any}
                                items={abilities}
                                onChange={setAbilities}
                            />
                        </Stack>

                        <Stack direction={"row"} gap={1} alignItems={"center"} sx={{ alignSelf: "flex-end" }}>
                            <Button
                                variant="contained"
                                color="inherit"
                                onClick={closeEdit}>
                                Batal
                            </Button>
                            <Button
                                disabled={!requestSave.isValid}
                                loading={requestSave.pending}
                                onClick={handleSave}
                                size="small"
                                variant="contained"
                                sx={{ alignSelf: 'end' }}
                                startIcon={<Save size={16} />}>
                                {editMode ? "Update" : "Simpan"}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </AnimatePresence>

            <RequestError
                request={requestGetRole}
                closable
                tryagain
                sx={{ mb: 2, mt: 2 }} />

            <Stack mx={2} mt={2} gap={2}>
                {roles.map((e, i) => (
                    <Stack
                        key={i}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "action.hover",
                        }}>
                        <Stack direction="row" alignItems="center" flex={1} minWidth={280}>
                            <Typography fontSize={16} fontWeight={600} alignSelf={"start"} mt={0.8}>{i + 1}.</Typography>
                            <Stack ml={1} flex={1}>
                                <Typography fontSize={22} fontWeight={600}>
                                    {e.label}
                                    {SYSTEM_ROLES_NAME.includes(e.id) && (
                                        <Chip color="primary" label={"System"} sx={{ ml: 1 }} size="small" />
                                    )}
                                </Typography>
                                <Stack direction="row" gap={0.5} flexWrap="wrap" mt={1}>
                                    {e.abilities.length ? e.abilities.map(a => (
                                        <Chip
                                            key={a}
                                            label={a}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: 11, height: 24 }}
                                        />
                                    )) : (
                                        <Typography color="text.secondary" fontSize={12}>
                                            Tidak ada abilities
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                        </Stack>
                        <Stack
                            direction="row"
                            spacing={1}
                            justifySelf={"flex-end"}
                            alignSelf={"flex-end"}
                            ml={['auto', 'auto', 2]}
                            mt={[2, 2, 0]}>
                            {!SYSTEM_ROLES_NAME.includes(e.id) ? (
                                <>
                                    <Button
                                        size="small"
                                        startIcon={<Edit size={16} />}
                                        onClick={() => handleEdit(e)}
                                        disabled={requestDelete.pending}>
                                        Edit
                                    </Button>
                                    <Button
                                        size="small"
                                        color="error"
                                        startIcon={<Trash2 size={16} />}
                                        onClick={() => handleDelete(e)}
                                        disabled={requestDelete.pending}>
                                        Hapus
                                    </Button>
                                </>
                            ) : (e as any).editable && (
                                <Button
                                    size="small"
                                    startIcon={<Edit size={16} />}
                                    onClick={() => handleEdit(e)}
                                    disabled={requestSave.pending}>
                                    Edit
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                ))}
            </Stack>

            {/* <ConfirmationDialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Hapus Role"
                message={`Apakah Anda yakin ingin menghapus role "${selectedRole?.label}"?`}
                loading={requestDelete.pending}
            /> */}

            <RequestError request={requestDelete} closable />
            <RequestError request={requestSave} closable />
        </Stack>
    );
}