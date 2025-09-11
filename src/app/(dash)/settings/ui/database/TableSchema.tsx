'use client'

import {
    Box,
    Chip,
    Divider,
    Stack,
    Typography,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Grid,
    useTheme,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    LinearProgress
} from '@mui/material';
import {
    Table as TableIcon,
    Copy,
    RefreshCw,
    Database as DatabaseIcon,
    Key,
    Hash,
    Link2,
    Eye,
    Check,
    X,
    Type
} from 'lucide-react';
import { useState } from 'react';
import { TableSchema as TypeTableSchema, ColumnInfo } from '@/server/functions/database';
import { AnimatePresence, motion } from 'motion/react';

export interface TableSchemaProps {
    schema: TypeTableSchema[];
    loading?: boolean;
    onRefresh?: () => void;
}

export default function TableSchema({ schema, loading = false, onRefresh }: TableSchemaProps) {
    const theme = useTheme();
    const [selectedTable, setSelectedTable] = useState<TypeTableSchema | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [copiedTable, setCopiedTable] = useState<string | null>(null);

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    const handleCopyTableName = (tableName: string) => {
        navigator.clipboard.writeText(tableName);
        setCopiedTable(tableName);
        setTimeout(() => setCopiedTable(null), 2000);
    };

    const handleViewDetails = (table: TypeTableSchema) => {
        setSelectedTable(table);
        setDetailDialogOpen(true);
    };

    const getColumnIcon = (column: ColumnInfo) => {
        if (column.primary) return <Key size={14} color="#ff6b35" />;
        if (column.foreignKey) return <Link2 size={14} color="#4caf50" />;
        if (column.unique) return <Hash size={14} color="#9c27b0" />;
        return <Type size={14} color="#666" />;
    };

    const getTypeColor = (type: string) => {
        const typeLower = type.toLowerCase();
        if (typeLower.includes('int')) return 'primary';
        if (typeLower.includes('char') || typeLower.includes('text')) return 'secondary';
        if (typeLower.includes('bool')) return 'success';
        if (typeLower.includes('date') || typeLower.includes('time')) return 'warning';
        if (typeLower.includes('json')) return 'info';
        return 'default';
    };

    const formatDefaultValue = (defaultValue?: string) => {
        if (!defaultValue) return 'NULL';
        if (defaultValue === 'CURRENT_TIMESTAMP') return 'NOW()';
        return defaultValue;
    };

    return (
        <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{
                        p: 1,
                        bgcolor: 'primary.main',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <TableIcon size={24} color="white" />
                    </Box>
                    <Stack>
                        <Typography fontSize={20} fontWeight={700}>
                            Table Schema
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {schema.length} tables in database
                        </Typography>
                    </Stack>
                </Stack>
                <Tooltip title="Refresh schema">
                    <IconButton
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                            bgcolor: theme.palette.action.hover,
                            '&:hover': {
                                bgcolor: theme.palette.action.selected
                            }
                        }}>
                        <RefreshCw size={18} />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Divider />

            {/* Loading State */}
            {loading && (
                <Box sx={{ width: '100%' }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                        Loading schema...
                    </Typography>
                </Box>
            )}

            {/* Schema Content */}
            {!loading && schema.length === 0 ? (
                <Stack alignItems="center" justifyContent="center" py={8}>
                    <DatabaseIcon size={48} color={theme.palette.text.disabled} />
                    <Typography variant="body2" color="text.secondary" mt={2}>
                        No schema available
                    </Typography>
                </Stack>
            ) : (
                <Grid container spacing={3}>
                    <AnimatePresence>
                        {schema.map((table, i) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={table.tableName}>
                                <Card
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: 0.1 * i }}
                                    variant="outlined"
                                    sx={{
                                        height: '100%',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme.shadows[4],
                                            borderColor: theme.palette.primary.light
                                        }
                                    }}>
                                    <CardContent sx={{ p: 2.5 }}>
                                        {/* Table Header */}
                                        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                            <TableIcon size={18} color={theme.palette.primary.main} />
                                            <Typography
                                                fontWeight={700}
                                                sx={{
                                                    flex: 1,
                                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                    backgroundClip: 'text',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    fontSize: '14px'
                                                }}>
                                                {table.tableName}
                                            </Typography>
                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title="Copy table name">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleCopyTableName(table.tableName)}
                                                        sx={{
                                                            opacity: 0.7,
                                                            '&:hover': { opacity: 1 }
                                                        }}>
                                                        <Copy size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="View details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewDetails(table)}
                                                        sx={{
                                                            opacity: 0.7,
                                                            '&:hover': { opacity: 1 }
                                                        }}>
                                                        <Eye size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>

                                        {copiedTable === table.tableName && (
                                            <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
                                                Copied!
                                            </Alert>
                                        )}

                                        {/* Table Stats */}
                                        <Stack direction="row" spacing={1} mb={2}>
                                            {table.rowCount !== undefined && (
                                                <Chip
                                                    label={`${table.rowCount} rows`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="secondary"
                                                />
                                            )}
                                            {table.size && (
                                                <Chip
                                                    label={table.size}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                />
                                            )}
                                        </Stack>

                                        {/* Columns Preview */}
                                        <Stack spacing={1}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                COLUMNS ({table.columns.length})
                                            </Typography>
                                            <Stack spacing={0.5}>
                                                {table.columns.slice(0, 5).map((col) => (
                                                    <Stack
                                                        key={col.name}
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                        sx={{
                                                            p: 1,
                                                            borderRadius: 1,
                                                            bgcolor: theme.palette.action.hover,
                                                        }}>
                                                        {getColumnIcon(col)}
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily: 'Monospace',
                                                                fontSize: '12px',
                                                                flex: 1
                                                            }}>
                                                            {col.name}
                                                        </Typography>
                                                        <Chip
                                                            label={col.type}
                                                            size="small"
                                                            variant="filled"
                                                            color={getTypeColor(col.type) as any}
                                                            sx={{ height: '20px', fontSize: '10px' }}
                                                        />
                                                    </Stack>
                                                ))}
                                                {table.columns.length > 5 && (
                                                    <Typography variant="caption" color="text.secondary" textAlign="center">
                                                        +{table.columns.length - 5} more columns
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </AnimatePresence>
                </Grid>
            )}

            {/* Table Details Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="md"
                fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TableIcon size={20} />
                        <Typography fontWeight={600}>{selectedTable?.tableName}</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedTable && (
                        <Stack spacing={2}>
                            {/* Table Statistics */}
                            <Stack direction="row" spacing={2}>
                                {selectedTable.rowCount !== undefined && (
                                    <Chip
                                        label={`${selectedTable.rowCount} rows`}
                                        variant="outlined"
                                        color="secondary"
                                    />
                                )}
                                {selectedTable.size && (
                                    <Chip
                                        label={selectedTable.size}
                                        variant="outlined"
                                        color="primary"
                                    />
                                )}
                            </Stack>

                            {/* Columns Table */}
                            <Typography variant="subtitle2" fontWeight={600}>
                                COLUMNS
                            </Typography>
                            <Box sx={{ overflow: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: theme.palette.action.hover }}>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Name</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Type</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Nullable</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Primary</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Unique</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px' }}>Default</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTable.columns.map((col, index) => (
                                            <tr key={col.name} style={{
                                                backgroundColor: index % 2 === 0 ? theme.palette.background.default : theme.palette.action.hover
                                            }}>
                                                <td style={{ padding: '8px', fontSize: '12px', fontFamily: 'Monospace' }}>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        {getColumnIcon(col)}
                                                        {col.name}
                                                    </Stack>
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '12px' }}>
                                                    <Chip
                                                        label={col.type}
                                                        size="small"
                                                        variant="outlined"
                                                        color={getTypeColor(col.type) as any}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '12px' }}>
                                                    {col.nullable ? <Check size={16} color="#4caf50" /> : <X size={16} color="#f44336" />}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '12px' }}>
                                                    {col.primary ? <Check size={16} color="#4caf50" /> : <X size={16} color="#f44336" />}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '12px' }}>
                                                    {col.unique ? <Check size={16} color="#4caf50" /> : <X size={16} color="#f44336" />}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '12px', fontFamily: 'Monospace' }}>
                                                    {formatDefaultValue(col.default)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Box>

                            {/* Foreign Keys */}
                            {selectedTable.columns.some(col => col.foreignKey) && (
                                <>
                                    <Typography variant="subtitle2" fontWeight={600} mt={2}>
                                        FOREIGN KEYS
                                    </Typography>
                                    <Stack spacing={1}>
                                        {selectedTable.columns
                                            .filter(col => col.foreignKey)
                                            .map((col) => (
                                                <Chip
                                                    key={col.name}
                                                    label={`${col.name} → ${col.foreignKey!.table}.${col.foreignKey!.column}`}
                                                    variant="outlined"
                                                    color={'secondary'}
                                                    size="small"
                                                    icon={<Link2 size={14} />}
                                                />
                                            ))}
                                    </Stack>
                                </>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}