import CloseSnackbar from '@/components/ui/CloseSnackbar';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { CORSRule } from '@/server/functions/storage';
import { Stack, Typography, Button, CircularProgress, Alert, Paper, Chip, IconButton, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Box, Card, CardContent, CardActions } from '@mui/material';
import { Pen, Plus, WifiCog, X, Copy, Check, Trash2, Download, Upload } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import { ReactNode, useEffect, useState } from 'react';

export interface DriveRuleManagerProps {
    children?: ReactNode;
}

export default function DriveRuleManager() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rules, setRules] = useState<CORSRule[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<CORSRule | null>(null);
    const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
    const [newRule, setNewRule] = useState<Omit<CORSRule, 'ID'>>({
        AllowedOrigins: [''],
        AllowedMethods: ['GET'],
        AllowedHeaders: [''],
        ExposeHeaders: [''],
        MaxAgeSeconds: 3600
    });

    const refreshConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await invokeFunction("getCorsOptions");
            if (!result.success) {
                setError(result.error || 'Failed to fetch CORS rules');
            } else {
                setRules(result.data || []);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (updatedRules: CORSRule[]) => {
        setSaving(true);
        setError(null);
        try {
            const result = await invokeFunction("updateCorsOption", { rules: updatedRules });
            if (!result.success) {
                throw new Error(result.error);
            } else {
                setRules(updatedRules);
                setDialogOpen(false);
                setEditingRule(null);
                setNewRule({
                    AllowedOrigins: [''],
                    AllowedMethods: ['GET'],
                    AllowedHeaders: [''],
                    ExposeHeaders: [''],
                    MaxAgeSeconds: 3600
                });
                enqueueSnackbar("CORS configuration updated successfully!", {
                    variant: "success",
                    action: CloseSnackbar
                });
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            console.error(err);
            enqueueSnackbar("Failed to update CORS configuration!", {
                variant: "error",
                action: CloseSnackbar
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAddRule = () => {
        const updatedRules = [...rules];
        if (editingRule && editingRule.ID) {
            // Update existing rule
            const index = updatedRules.findIndex(rule => rule.ID === editingRule.ID);
            if (index !== -1) {
                updatedRules[index] = { ...newRule, ID: editingRule.ID };
            }
        } else {
            // Add new rule
            updatedRules.push({ ...newRule, ID: Date.now().toString() });
        }
        updateConfig(updatedRules);
    };

    const handleDeleteRule = (id: string) => {
        const updatedRules = rules.filter(rule => rule.ID !== id);
        updateConfig(updatedRules);
    };

    const handleEditRule = (rule: CORSRule) => {
        setEditingRule(rule);
        setNewRule({
            AllowedOrigins: [...rule.AllowedOrigins],
            AllowedMethods: [...rule.AllowedMethods],
            AllowedHeaders: [...rule.AllowedHeaders],
            ExposeHeaders: [...rule.ExposeHeaders],
            MaxAgeSeconds: rule.MaxAgeSeconds
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingRule(null);
        setNewRule({
            AllowedOrigins: [''],
            AllowedMethods: ['GET'],
            AllowedHeaders: [''],
            ExposeHeaders: [''],
            MaxAgeSeconds: 3600
        });
    };

    const copyRuleConfig = async (rule: CORSRule) => {
        try {
            const configText = JSON.stringify(rule, null, 2);
            await navigator.clipboard.writeText(configText);
            setCopiedRuleId(rule.ID);
            enqueueSnackbar("CORS rule configuration copied to clipboard!", {
                variant: "success",
                action: CloseSnackbar
            });
            setTimeout(() => setCopiedRuleId(null), 2000);
        } catch (err) {
            enqueueSnackbar("Failed to copy configuration!", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    };

    const exportAllConfig = () => {
        try {
            const configText = JSON.stringify(rules, null, 2);
            const blob = new Blob([configText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cors-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            enqueueSnackbar("CORS configuration exported!", {
                variant: "success",
                action: CloseSnackbar
            });
        } catch (err) {
            enqueueSnackbar("Failed to export configuration!", {
                variant: "error",
                action: CloseSnackbar
            });
        }
    };

    const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsedRules = JSON.parse(content) as CORSRule[];
                
                if (Array.isArray(parsedRules) && parsedRules.every(rule => 
                    rule.AllowedOrigins && rule.AllowedMethods && rule.AllowedHeaders && rule.ExposeHeaders
                )) {
                    updateConfig(parsedRules);
                } else {
                    throw new Error("Invalid configuration format");
                }
            } catch (err) {
                enqueueSnackbar("Invalid configuration file!", {
                    variant: "error",
                    action: CloseSnackbar
                });
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const updateArrayField = (field: keyof Omit<CORSRule, 'ID' | 'MaxAgeSeconds'>, index: number, value: string) => {
        const updatedArray = [...newRule[field]];
        updatedArray[index] = value;
        setNewRule({ ...newRule, [field]: updatedArray });
    };

    const addArrayField = (field: keyof Omit<CORSRule, 'ID' | 'MaxAgeSeconds'>) => {
        setNewRule({ ...newRule, [field]: [...newRule[field], ''] });
    };

    const removeArrayField = (field: keyof Omit<CORSRule, 'ID' | 'MaxAgeSeconds'>, index: number) => {
        if (newRule[field].length <= 1) return;
        const updatedArray = [...newRule[field]];
        updatedArray.splice(index, 1);
        setNewRule({ ...newRule, [field]: updatedArray });
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            refreshConfig();
        }
    }, [mounted]);

    if (loading) {
        return (
            <Stack alignItems="center" justifyContent="center" p={4} flex={1}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>Loading CORS rules...</Typography>
            </Stack>
        );
    }

    return (
        <Stack spacing={3} flex={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <WifiCog size={24} className="text-primary" />
                    <Typography variant="h5" fontWeight="600">CORS Rules Management</Typography>
                </Stack>
                
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                        variant="outlined"
                        startIcon={<Upload size={18} />}
                        component="label">
                        Import
                        <input
                            type="file"
                            hidden
                            accept=".json"
                            onChange={importConfig}
                        />
                    </Button>
                    
                    <Button
                        variant="outlined"
                        startIcon={<Download size={18} />}
                        onClick={exportAllConfig}
                        disabled={rules.length === 0}>
                        Export
                    </Button>
                    
                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={() => setDialogOpen(true)}>
                        Add Rule
                    </Button>
                </Stack>
            </Stack>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {rules.length === 0 ? (
                <Card variant="outlined" sx={{ textAlign: 'center', py: 6, bgcolor: 'background.default' }}>
                    <CardContent>
                        <Box component={WifiCog} size={48} className="text-muted-foreground" sx={{ mb: 2 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                            No CORS Rules Configured
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            Get started by adding your first CORS rule to manage cross-origin requests.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => setDialogOpen(true)}>
                            Add Your First Rule
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {rules.map((rule) => (
                        <Card key={rule.ID} variant="outlined" sx={{ '&:hover': { boxShadow: 1 } }}>
                            <CardContent sx={{ pb: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                    <Stack spacing={2} flexGrow={1}>
                                        <Typography variant="subtitle1" fontWeight="500">
                                            Rule: {rule.ID}
                                        </Typography>

                                        <Box>
                                            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                                                ALLOWED ORIGINS
                                            </Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                {rule.AllowedOrigins.map((origin, idx) => (
                                                    <Chip key={idx} label={origin} size="small" variant="outlined" />
                                                ))}
                                            </Stack>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                                                ALLOWED METHODS
                                            </Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                {rule.AllowedMethods.map((method, idx) => (
                                                    <Chip key={idx} label={method} size="small" color="primary" />
                                                ))}
                                            </Stack>
                                        </Box>

                                        {rule.AllowedHeaders.length > 0 && (
                                            <Box>
                                                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                                                    ALLOWED HEADERS
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                    {rule.AllowedHeaders.map((header, idx) => (
                                                        <Chip key={idx} label={header} size="small" variant="outlined" />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}

                                        {rule.ExposeHeaders.length > 0 && (
                                            <Box>
                                                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                                                    EXPOSE HEADERS
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                    {rule.ExposeHeaders.map((header, idx) => (
                                                        <Chip key={idx} label={header} size="small" variant="outlined" />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}

                                        <Typography variant="body2" color="textSecondary">
                                            Max Age: {rule.MaxAgeSeconds} seconds
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton
                                            size="small"
                                            onClick={() => copyRuleConfig(rule)}
                                            title="Copy configuration"
                                        >
                                            {copiedRuleId === rule.ID ? <Check size={18} /> : <Copy size={18} />}
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditRule(rule)}
                                            title="Edit rule"
                                        >
                                            <Pen size={18} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => rule.ID && handleDeleteRule(rule.ID)}
                                            title="Delete rule"
                                            color="error"
                                        >
                                            <Trash2 size={18} />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" fontWeight="500">
                        {editingRule ? 'Edit CORS Rule' : 'Create New CORS Rule'}
                    </Typography>
                </DialogTitle>
                
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Allowed Origins *</Typography>
                            {newRule.AllowedOrigins.map((origin, index) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <TextField
                                        value={origin}
                                        onChange={(e) => updateArrayField('AllowedOrigins', index, e.target.value)}
                                        placeholder="https://example.com"
                                        fullWidth
                                        size="small"
                                        required
                                    />
                                    <IconButton
                                        onClick={() => removeArrayField('AllowedOrigins', index)}
                                        disabled={newRule.AllowedOrigins.length <= 1}
                                        size="small"
                                    >
                                        <X size={16} />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button 
                                onClick={() => addArrayField('AllowedOrigins')} 
                                startIcon={<Plus size={16} />}
                                size="small"
                            >
                                Add Origin
                            </Button>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Allowed Methods *</Typography>
                            {newRule.AllowedMethods.map((method, index) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <TextField
                                        value={method}
                                        onChange={(e) => updateArrayField('AllowedMethods', index, e.target.value)}
                                        placeholder="GET"
                                        fullWidth
                                        size="small"
                                        required
                                    />
                                    <IconButton
                                        onClick={() => removeArrayField('AllowedMethods', index)}
                                        disabled={newRule.AllowedMethods.length <= 1}
                                        size="small"
                                    >
                                        <X size={16} />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button 
                                onClick={() => addArrayField('AllowedMethods')} 
                                startIcon={<Plus size={16} />}
                                size="small"
                            >
                                Add Method
                            </Button>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Allowed Headers</Typography>
                            {newRule.AllowedHeaders.map((header, index) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <TextField
                                        value={header}
                                        onChange={(e) => updateArrayField('AllowedHeaders', index, e.target.value)}
                                        placeholder="Content-Type"
                                        fullWidth
                                        size="small"
                                    />
                                    <IconButton
                                        onClick={() => removeArrayField('AllowedHeaders', index)}
                                        disabled={newRule.AllowedHeaders.length <= 1}
                                        size="small"
                                    >
                                        <X size={16} />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button 
                                onClick={() => addArrayField('AllowedHeaders')} 
                                startIcon={<Plus size={16} />}
                                size="small"
                            >
                                Add Header
                            </Button>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Expose Headers</Typography>
                            {newRule.ExposeHeaders.map((header, index) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <TextField
                                        value={header}
                                        onChange={(e) => updateArrayField('ExposeHeaders', index, e.target.value)}
                                        placeholder="ETag"
                                        fullWidth
                                        size="small"
                                    />
                                    <IconButton
                                        onClick={() => removeArrayField('ExposeHeaders', index)}
                                        disabled={newRule.ExposeHeaders.length <= 1}
                                        size="small"
                                    >
                                        <X size={16} />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button 
                                onClick={() => addArrayField('ExposeHeaders')} 
                                startIcon={<Plus size={16} />}
                                size="small"
                            >
                                Add Header
                            </Button>
                        </Box>

                        <TextField
                            label="Max Age (seconds)"
                            type="number"
                            value={newRule.MaxAgeSeconds}
                            onChange={(e) => setNewRule({
                                ...newRule,
                                MaxAgeSeconds: parseInt(e.target.value) || 3600
                            })}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                    </Stack>
                </DialogContent>
                
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddRule}
                        variant="contained"
                        disabled={saving || newRule.AllowedOrigins.some(o => !o) || newRule.AllowedMethods.some(m => !m)}
                        startIcon={saving ? <CircularProgress size={16} /> : null}>
                        {editingRule ? 'Update Rule' : 'Create Rule'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}