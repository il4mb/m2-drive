'use client'

import { Button, Checkbox, FormControlLabel, IconButton, MenuItem, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import { Plus, X, Pencil, HardDrive } from "lucide-react";
import useRequest from "@/components/hooks/useRequest";
import useRoles from "@/components/hooks/useRoles";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import RequestError from "@/components/RequestError";
import { addDriveSizeOptions, DriveSizeOption, getDriveSizeOptions, SizeUnit } from "@/actions/options-drive-size";

export default function DriveSizeManager() {

    const roles = useRoles();
    const isMobile = useMediaQuery("(max-width:600px)");

    const [open, setOpen] = useState(false);
    const [role, setRole] = useState("user");
    const [value, setValue] = useState<number>(10);
    const [unit, setUnit] = useState<SizeUnit>("gb");
    const [unlimited, setUnlimited] = useState(false);
    const [options, setOptions] = useState<DriveSizeOption[]>([]);

    const getRequest = useRequest({
        action: getDriveSizeOptions,
        onSuccess(result) {
            setOptions(result.data || []);
        },
    });

    const addRequest = useRequest({
        action: addDriveSizeOptions,
        params: { roleName: role, size: value, unlimited, unit },
        onSuccess() {
            getRequest.send();
            closeEdit();
        },
    });

    const handleToggle = () => setOpen((prev) => !prev);

    const closeEdit = () => {
        setRole("user");
        setValue(100);
        setUnit("mb");
        setUnlimited(false);
        setOpen(false);
    };

    const handleSubmit = () => addRequest.send();

    const handleEdit = (opt: DriveSizeOption) => {
        setRole(opt.roleName);
        setValue(opt.size);
        setUnit(opt.unit);
        setUnlimited(opt.size === Infinity);
        setOpen(true);
    };

    useEffect(() => {
        getRequest.send();
    }, [roles]);

    return (
        <Stack>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                    <HardDrive />
                    <Typography fontSize={18} fontWeight={900}>
                        Drive Size Manager
                    </Typography>
                </Stack>
                <Button
                    onClick={handleToggle}
                    size="small"
                    startIcon={open ? <X size={16} /> : <Plus size={16} />}
                    variant="contained">
                    {open ? "Batal" : "Tambah / Ubah"}
                </Button>
            </Stack>

            {/* Form */}
            <AnimatePresence>
                {open && (
                    <Stack
                        layoutId="add-form"
                        component={motion.div}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        gap={2}
                        sx={{
                            bgcolor: "background.paper",
                            borderRadius: 2,
                            p: 3,
                            mb: 4,
                        }}>
                        <RequestError request={addRequest} closable sx={{ mb: 1 }} />

                        <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center">
                            {/* Role */}
                            <TextField
                                label="Role"
                                select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                sx={{ minWidth: 150 }}>
                                {roles.map((r) => (
                                    <MenuItem key={r.name} value={r.name}>
                                        {r.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {/* Unlimited checkbox */}
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={unlimited}
                                        onChange={(e) => setUnlimited(e.target.checked)}
                                    />
                                }
                                label="Tanpa batas?" />

                            {/* Size + Unit */}
                            {!unlimited && (
                                <>
                                    <TextField
                                        type="number"
                                        placeholder="Ukuran"
                                        value={value ?? ""}
                                        onChange={(e) => setValue(Number(e.target.value))}
                                        sx={{ width: 120 }}
                                        inputProps={{ min: 1, step: 1 }}
                                    />
                                    <TextField
                                        select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value as SizeUnit)}
                                        sx={{ width: 140 }}>
                                        <MenuItem value="kb">Kilo Byte</MenuItem>
                                        <MenuItem value="mb">Mega Byte</MenuItem>
                                        <MenuItem value="gb">Giga Byte</MenuItem>
                                    </TextField>
                                </>
                            )}
                        </Stack>

                        <Stack direction={"row"} gap={1} alignItems={"center"} sx={{ alignSelf: "flex-end" }}>
                            <Button
                                variant="contained"
                                color="inherit"
                                onClick={closeEdit}>
                                Batal
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!role || (!unlimited && !value)}>
                                Simpan
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </AnimatePresence>

            {/* List */}
            <Stack mx={2} mt={2} gap={2}>
                {options.length == 0 && (
                    <Typography color="text.secondary">Tidak ada aturan</Typography>
                )}
                {options.map((opt, i) => {
                    const roleInfo = roles.find((r) => r.name === opt.roleName);
                    const label = roleInfo?.label || opt.roleName;
                    const isUnlimited = opt.size === Infinity;

                    return (
                        <Stack
                            key={opt.roleName}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "action.hover",
                            }}>
                            <Stack>
                                <Typography fontWeight={600}>{label}</Typography>
                                <Typography fontSize={14} color={isUnlimited ? "success.main" : "text.secondary"}>
                                    {isUnlimited
                                        ? "Tanpa batas"
                                        : `${opt.size} ${opt.unit.toUpperCase()}`}
                                </Typography>
                            </Stack>
                            <IconButton onClick={() => handleEdit(opt)}>
                                <Pencil size={16} />
                            </IconButton>
                        </Stack>
                    );
                })}
            </Stack>
        </Stack>
    );
}
