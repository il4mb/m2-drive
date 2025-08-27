import { Button, Stack, TextField, Typography } from "@mui/material";
import { Plus, Save, ShieldUser, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChangeEvent, useState } from "react";
import TransferList from "./TransferList";

const DEFAULT_ROLES: TRole[] = [
    {
        name: 'admin',
        label: "Admin"
    },
    {
        name: "user",
        label: "Basic User"
    }
]

type TRole = {
    name: string;
    label: string;
}
export default function RoleManager() {

    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [accessibility, setAccessibility] = useState<string[]>([]);

    const [roles, setRoles] = useState<TRole[]>(DEFAULT_ROLES);

    const handleToggle = () => setOpen(prev => !prev);
    const handleClose = () => setOpen(false);

    const handleSetLabel = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLabel(value);
        setName(value.toLowerCase().replace(/[^a-z]/, ''));
    }

    const handleSetName = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value.replace(/[^a-z]/, ''));
    }

    return (
        <Stack component={motion.div} layout>
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
                        spacing={1} p={1}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2, px: 3, py: 2, mb: 4 }}>

                        <Typography
                            fontSize={16}
                            fontWeight={600}>
                            Tambah Role
                        </Typography>

                        <TextField
                            value={label}
                            onChange={handleSetLabel}
                            label={"Label"}
                            autoFocus
                            autoCapitalize="on" />

                        <TextField
                            value={name}
                            onChange={handleSetName}
                            label={"Name"} />
                        <Typography fontSize={14} fontWeight={600}>
                            Aksesibilitas
                        </Typography>
                        <TransferList
                            defineList={[
                                {
                                    label: "Bisa upload File",
                                    value: 'can-upload-file'
                                },
                                {
                                    label: "Bisa Berbagi File",
                                    value: 'can-share-file'
                                },
                                {
                                    label: "Bisa Berbagi Folder",
                                    value: 'can-share-folder'
                                },
                                {
                                    label: "Bisa Sunting File",
                                    value: 'can-edit-file'
                                },
                                {
                                    label: "Bisa Edit Pengguna",
                                    value: 'can-edit-user'
                                },
                                {
                                    label: "Bisa Hapus Pengguna",
                                    value: 'can-delete-user'
                                },
                                {
                                    label: "Bisa Tambah Pengguna",
                                    value: 'can-add-user'
                                }
                            ]}
                            items={accessibility}
                            onChange={setAccessibility} />

                        <Button size="small" variant="contained" sx={{ alignSelf: 'end' }} startIcon={<Save size={16} />}>
                            Simpan
                        </Button>
                    </Stack>
                )}
            </AnimatePresence>

            <Stack mx={2} mt={2}>
                {roles.map((e, i) => (
                    <Typography fontSize={16} fontWeight={600}>
                        {i + 1}.{" "} {e.label}
                    </Typography>
                ))}
            </Stack>

        </Stack>
    )
}