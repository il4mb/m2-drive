'use client'

import {
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
    Card,
    CardContent,
    Box,
    Chip,
    Alert,
    Tooltip,
    Divider
} from "@mui/material";
import {
    Plus,
    X,
    Pencil,
    Ruler,
    InfinityIcon,
    Save,
    DownloadCloud,
    AlertCircle,
    CheckCircle
} from "lucide-react";
import useRequest from "@/hooks/useRequest";
import useRoles from "@/hooks/useRoles";
import { addMaxUploadOptions, getMaxUploadOptions, MaxUploadOption, UploadUnit } from "@/actions/options-max-upload";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import RequestError from "@/components/RequestError";

const UNIT_LABELS = {
    kb: "KB",
    mb: "MB",
    gb: "GB"
} as const;

const UNIT_CONVERSION = {
    kb: 1,
    mb: 1024,
    gb: 1024 * 1024
} as const;

export default function UploadSizeManager() {


    const roles = useRoles();
    const isMobile = useMediaQuery("(max-width:600px)");

    const [open, setOpen] = useState(false);
    const [role, setRole] = useState("user");
    const [value, setValue] = useState<number>(100);
    const [unit, setUnit] = useState<UploadUnit>("mb");
    const [unlimited, setUnlimited] = useState(false);
    const [options, setOptions] = useState<MaxUploadOption[]>([]);
    const [editingOption, setEditingOption] = useState<MaxUploadOption | null>(null);

    const getRequest = useRequest({
        action: getMaxUploadOptions,
        onSuccess(result) {
            setOptions(result.data || []);
        },
    });

    const addRequest = useRequest({
        action: addMaxUploadOptions,
        // @ts-ignore
        params: { roleName: role, size: unlimited ? Infinity : value, unit: unlimited ? "mb" : unit },
        onSuccess() {
            getRequest.send();
            closeEdit();
            setEditingOption(null);
        },
    });

    const handleToggle = () => {
        if (open) {
            closeEdit();
        } else {
            setOpen(true);
            setEditingOption(null);
        }
    };

    const closeEdit = () => {
        setRole("user");
        setValue(100);
        setUnit("mb");
        setUnlimited(false);
        setOpen(false);
        setEditingOption(null);
    };

    const handleSubmit = () => addRequest.send();

    const handleEdit = (opt: MaxUploadOption) => {
        setRole(opt.roleName);
        setValue(opt.size === Infinity ? 100 : opt.size);
        setUnit(opt.unit);
        setUnlimited(opt.size === Infinity);
        setOpen(true);
        setEditingOption(opt);
    };

    const handleDelete = (roleName: string) => {
        // Implement delete functionality
        // console.log("Delete option for:", roleName);
    };

    const formatFileSize = (bytes: number, unit: UploadUnit = 'mb') => {
        if (bytes === Infinity) return "Unlimited";

        const sizeInUnit = bytes / UNIT_CONVERSION[unit];
        return `${Math.round(sizeInUnit * 100) / 100} ${UNIT_LABELS[unit]}`;
    };

    const getRoleUsage = (roleName: string) => {
        // Mock data - replace with actual user count
        return Math.floor(Math.random() * 50);
    };

    useEffect(() => {
        getRequest.send();
    }, [roles]);

    const isLoading = getRequest.pending || addRequest.pending;
    const isEditing = !!editingOption;

    return (
        <Stack spacing={3}>
            {/* Header */}
            <Card
                sx={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    borderRadius: 3
                }}
            >
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
                                <DownloadCloud size={32} />
                            </Box>
                            <Stack>
                                <Typography variant="h4" fontWeight="bold">
                                    Upload Size Manager
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Kelola batas ukuran upload untuk setiap role
                                </Typography>
                            </Stack>
                        </Stack>
                        <Button
                            onClick={handleToggle}
                            size="large"
                            startIcon={open ? <X size={20} /> : <Plus size={20} />}
                            variant="contained"
                            sx={{
                                bgcolor: 'white',
                                color: '#4facfe',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                }
                            }}
                        >
                            {open ? "Batal" : "Tambah Aturan"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Form */}
            <AnimatePresence>
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
                                            <Ruler size={20} />
                                        </Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            {isEditing ? "Edit Aturan Upload" : "Tambah Aturan Upload"}
                                        </Typography>
                                    </Stack>

                                    <RequestError request={addRequest} closable sx={{ mb: 1 }} />

                                    <Stack
                                        direction={isMobile ? "column" : "row"}
                                        spacing={3}
                                        alignItems={isMobile ? "stretch" : "center"}
                                        flexWrap="wrap"
                                    >
                                        {/* Role Selection */}
                                        <TextField
                                            label="Role"
                                            select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            sx={{ minWidth: 200 }}
                                            disabled={isEditing}
                                        >
                                            {roles.map((r) => (
                                                <MenuItem key={r.id} value={r.id}>
                                                    {r.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>

                                        {/* Unlimited Option */}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={unlimited}
                                                    onChange={(e) => setUnlimited(e.target.checked)}
                                                    icon={<InfinityIcon size={16} />}
                                                    checkedIcon={<InfinityIcon size={16} />}
                                                />
                                            }
                                            label="Unlimited"
                                        />

                                        {/* Size Inputs */}
                                        {!unlimited && (
                                            <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center">
                                                <TextField
                                                    type="number"
                                                    label="Ukuran"
                                                    value={value}
                                                    onChange={(e) => setValue(Math.max(1, Number(e.target.value)))}
                                                    sx={{ width: 120 }}
                                                    inputProps={{ min: 1, step: 1 }}
                                                />
                                                <TextField
                                                    select
                                                    label="Satuan"
                                                    value={unit}
                                                    onChange={(e) => setUnit(e.target.value as UploadUnit)}
                                                    sx={{ width: 140 }}
                                                >
                                                    <MenuItem value="kb">Kilo Byte (KB)</MenuItem>
                                                    <MenuItem value="mb">Mega Byte (MB)</MenuItem>
                                                    <MenuItem value="gb">Giga Byte (GB)</MenuItem>
                                                </TextField>
                                            </Stack>
                                        )}
                                    </Stack>

                                    {/* Preview */}
                                    <Alert severity="info" icon={<CheckCircle size={18} />}>
                                        <Typography variant="body2">
                                            {unlimited ? (
                                                "Upload tanpa batas ukuran"
                                            ) : (
                                                `Batas upload: ${value} ${UNIT_LABELS[unit]}`
                                            )}
                                        </Typography>
                                    </Alert>

                                    <Stack direction={"row"} spacing={2} justifyContent={"flex-end"}>
                                        <Button
                                            variant="outlined"
                                            onClick={closeEdit}
                                            disabled={isLoading}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={handleSubmit}
                                            disabled={!role || (!unlimited && !value) || isLoading}
                                            startIcon={<Save size={18} />}
                                            loading={isLoading}
                                        >
                                            {isEditing ? "Update" : "Simpan"}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rules List */}
            <Stack spacing={2}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    Aturan Upload ({options.length})
                </Typography>

                {options.length === 0 && !getRequest.pending && (
                    <Alert severity="info" icon={<AlertCircle />}>
                        Belum ada aturan upload yang ditetapkan. Tambahkan aturan untuk membatasi ukuran upload.
                    </Alert>
                )}

                <Stack spacing={2}>
                    <AnimatePresence>
                        {options.map((opt, index) => {
                            const roleInfo = roles.find((r) => r.id === opt.roleName);
                            const label = roleInfo?.label || opt.roleName;
                            const isUnlimited = opt.size === Infinity;
                            const userCount = getRoleUsage(opt.roleName);

                            return (
                                <motion.div
                                    key={opt.roleName}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            border: editingOption?.roleName === opt.roleName ? '2px solid' : '1px solid',
                                            borderColor: editingOption?.roleName === opt.roleName ? 'primary.main' : 'divider',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <CardContent>
                                            <Stack
                                                direction={{ xs: 'column', md: 'row' }}
                                                spacing={3}
                                                alignItems={{ md: 'center' }}
                                                justifyContent="space-between"
                                            >
                                                {/* Rule Info */}
                                                <Stack spacing={1} flex={1}>
                                                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                                        <Typography variant="h6" fontWeight="bold">
                                                            {label}
                                                        </Typography>
                                                        <Chip
                                                            label={`${userCount} pengguna`}
                                                            size="small"
                                                            color="info"
                                                            variant="outlined"
                                                        />
                                                    </Stack>

                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        {isUnlimited ? (
                                                            <>
                                                                <InfinityIcon size={20} color="#4caf50" />
                                                                <Typography variant="body1" color="success.main" fontWeight="medium">
                                                                    Unlimited Upload
                                                                </Typography>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Ruler size={16} />
                                                                <Typography variant="body1" color="text.primary" fontWeight="medium">
                                                                    {formatFileSize(opt.size * UNIT_CONVERSION[opt.unit], opt.unit)}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    ({opt.size} {UNIT_LABELS[opt.unit]})
                                                                </Typography>
                                                            </>
                                                        )}
                                                    </Stack>
                                                </Stack>

                                                {/* Actions */}
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title="Edit aturan">
                                                        <IconButton
                                                            onClick={() => handleEdit(opt)}
                                                            disabled={isLoading}
                                                            color="primary"
                                                        >
                                                            <Pencil size={18} />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title="Hapus aturan">
                                                        <IconButton
                                                            onClick={() => handleDelete(opt.roleName)}
                                                            disabled={isLoading}
                                                            color="error"
                                                        >
                                                            <X size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </Stack>
            </Stack>

            {/* Statistics */}
            {options.length > 0 && (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Stack spacing={2}>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                                Statistik Upload
                            </Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} divider={<Divider orientation="vertical" flexItem />}>
                                <Box textAlign="center">
                                    <Typography variant="h4" fontWeight="bold" color="primary">
                                        {options.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Aturan Aktif
                                    </Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" fontWeight="bold" color="success.main">
                                        {options.filter(opt => opt.size === Infinity).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Unlimited
                                    </Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h4" fontWeight="bold" color="info.main">
                                        {roles.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Role
                                    </Typography>
                                </Box>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Stack>
    );
}