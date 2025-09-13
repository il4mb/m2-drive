import ConfirmationDialog from '@/components/ui/dialog/ConfirmationDialog';
import Role from '@/entities/Role';
import { useMyPermission } from '@/hooks/useMyPermission';
import { getCount, Json } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/SnapshotManager';
import { SYSTEM_ROLES } from '@/permission';
import { Alert, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { AlertCircle, Copy, Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface RoleItemProps {
    role: Role;
    selected?: Role | null;
    loading: boolean;
    onEdit: (r: Role) => void;
    onDelete: (r: Role) => void;
    onDuplicate: (r: Role) => void;
}
export default function RoleItem({ role, selected, loading, onEdit, onDuplicate, onDelete }: RoleItemProps) {

    const canManageRole = useMyPermission("can-manage-role");
    const SYSTEM_ROLES_NAME = SYSTEM_ROLES.map(e => e.id);
    const [count, setCount] = useState(0);

    useEffect(() => {
        const id = role.id;
        const query = getCount("user").where(Json("meta", "role"), "==", id);
        return onSnapshot(query, setCount);
    }, [role]);

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: selected?.id === role.id ? '2px solid' : '1px solid',
                borderColor: selected?.id === role.id ? 'primary.main' : 'divider',
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
                            <Chip variant={"outlined"} label={`${count > 99 ? "99+" : count} users`} />
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

                    {canManageRole && (
                        <Stack
                            direction={{ xs: 'row', md: 'column' }}
                            spacing={1}
                            alignItems={{ xs: 'center', md: 'flex-end' }}>
                            {!SYSTEM_ROLES_NAME.includes(role.id) ? (
                                <>
                                    <Tooltip title="Edit role">
                                        <IconButton
                                            onClick={() => onEdit(role)}
                                            disabled={loading}
                                            color="primary">
                                            <Edit size={18} />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Duplikat role">
                                        <IconButton
                                            onClick={() => onDuplicate(role)}
                                            disabled={loading}
                                            color="info">
                                            <Copy size={18} />
                                        </IconButton>
                                    </Tooltip>

                                    <ConfirmationDialog
                                        triggerElement={
                                            <Tooltip title="Hapus role">
                                                <IconButton
                                                    disabled={loading}
                                                    color="error">
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                        onConfirm={async () => onDelete(role)}
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
                                        onClick={() => onEdit(role)}
                                        disabled={loading}
                                        color="primary">
                                        <Edit size={18} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    )}

                </Stack>
            </CardContent>
        </Card>
    );
}