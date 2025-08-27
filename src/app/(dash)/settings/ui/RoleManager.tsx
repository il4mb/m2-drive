import { Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { CirclePlus, PersonStanding, Plus, Save, ShieldUser, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChangeEvent, useEffect, useState } from "react";
import TransferList from "./TransferList";
import { PERMISSION_LIST, SYSTEM_ROLES } from "@/permission";
import useRequest from "@/components/hooks/useRequest";
import { addRole, getAllRole } from "@/actions/manage-role";
import RequestError from "@/components/RequestError";
import Role from "@/entity/Role";


export default function RoleManager() {

    const SYSTEM_ROLES_NAME = SYSTEM_ROLES.map(e => e.name);

    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [abilities, setAbilities] = useState<string[]>([])
    const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);

    const requestGetRole = useRequest({
        action: getAllRole,
        onSuccess(result) {
            setRoles([...result.data, ...SYSTEM_ROLES]);
        },
    });

    const requestAdd = useRequest({
        action: addRole,
        params: { name, label, abilities: abilities },
        validator({ name, label, abilities }) {
            return Boolean(name.length > 3 && label.length > 3 && abilities.length > 0)
        },
        onSuccess({ data }) {
            setName('');
            setLabel('');
            setAbilities([]);
            setOpen(false);
            setRoles(prev => ([data, ...prev].filter(e => e != undefined)));
        },
    })

    const handleToggle = () => {
        setOpen(prev => !prev);
        setName('');
        setLabel('');
        setAbilities([]);
    }

    const handleSetLabel = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLabel(value);
        setName(value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]+/g, '').trim());
    }

    const handleSetName = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value.trim().replace(/\s+/g, '-').replace(/[^a-z-]+/g, '').trim());
    }

    useEffect(() => {
        requestGetRole.send()
    }, [])

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
                            <Typography
                                fontSize={16}
                                fontWeight={600}>
                                Tambah Role
                            </Typography>
                        </Stack>

                        <RequestError request={requestAdd} closable sx={{ mb: 2, mt: 0 }} />

                        <Stack>
                            <TextField
                                value={label}
                                onChange={handleSetLabel}
                                label={"Label"}
                                autoFocus
                                autoCapitalize="on"
                                disabled={requestAdd.pending} />
                            <Typography component={"small"} fontSize={12} color="text.secondary">
                                {label.length} / 3-50
                            </Typography>
                        </Stack>

                        <Stack>
                            <TextField
                                value={name}
                                onChange={handleSetName}
                                label={"Name"}
                                disabled={requestAdd.pending} />
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
                                defineList={PERMISSION_LIST}
                                items={abilities}
                                onChange={setAbilities}
                            />
                        </Stack>

                        <Button
                            disabled={!requestAdd.isValid}
                            loading={requestAdd.pending}
                            onClick={requestAdd.send}
                            size="small"
                            variant="contained"
                            sx={{ alignSelf: 'end' }}
                            startIcon={<Save size={16} />}>
                            Simpan
                        </Button>
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontSize={16} fontWeight={600} alignSelf={"start"} mt={0.8}>{i + 1}.</Typography>
                        <Stack ml={1}>
                            <Typography fontSize={22} fontWeight={600}>
                                {e.label}
                                {SYSTEM_ROLES_NAME.includes(e.name) && (
                                    <Chip color="primary" label={"System"} sx={{ ml: 1 }} />
                                )}
                            </Typography>
                            <Stack direction="row" gap={0.5} flexWrap="wrap">
                                {e.abilities?.map(a => (
                                    <Typography
                                        key={a}
                                        fontSize={11}
                                        sx={{ bgcolor: "action.hover", px: 1, borderRadius: 1 }}>
                                        {a}
                                    </Typography>
                                ))}
                            </Stack>
                        </Stack>
                        {!SYSTEM_ROLES_NAME.includes(e.name) && (
                            <Stack direction="row" spacing={1}>
                                <Button size="small">Edit</Button>
                                <Button size="small" color="error">Hapus</Button>
                            </Stack>
                        )}
                    </Stack>

                ))}
            </Stack>

        </Stack>
    )
}