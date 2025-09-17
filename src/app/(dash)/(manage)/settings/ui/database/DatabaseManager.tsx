'use client'

import { formatFileSize, formatDateFromEpoch } from '@/libs/utils';
import {
    Box,
    Chip,
    Divider,
    Paper,
    Stack,
    Tab,
    Tabs,
    Typography,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Grid,
    alpha,
    useTheme,
    Button
} from '@mui/material';
import {
    Database,
    Table as TableIcon,
    Copy,
    RefreshCw,
    Database as DatabaseIcon,
    Key,
    Hash,
    Link2,
    DatabaseBackup,
    DatabaseZap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import QueryRunner from './QueryRunner';
import { a11yProps, TabPanel } from "@/app/(dash)/(manage)/settings/ui/TabPanel";
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import { DatabaseInfo } from '@/server/functions/database';
import { useActionsProvider } from '@/components/navigation/ActionsProvider';
import ActionView from '@/components/navigation/ActionView';
import TableSchema from './TableSchema';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';
import BackupDatabase from './BackupDatabase';
import PermissionSuspense from '@/components/PermissionSuspense';

export default function DatabaseManager() {

    const { addAction } = useActionsProvider();
    const [info, setInfo] = useState<DatabaseInfo>();
    const schema = useMemo(() => Object.fromEntries(info?.schema.map(e => ([e.tableName, e.columns.map(c => c.name)])) || []), [info]);
    const [value, setValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    }

    const handleBackup = async () => {
        try {
            const result = await invokeFunction("backupDatabase");
            if (!result.success) {
                throw new Error(result.error);
            } else {
                enqueueSnackbar("Backup database are in queue", {
                    variant: "success",
                    action: CloseSnackbar
                });
            }
        } catch (error: any) {
            enqueueSnackbar(error.message || "Failed to backup database", {
                variant: "error",
                action: CloseSnackbar,
            });
        }
    }


    const handleFetchInfo = () => {
        setLoading(true);
        invokeFunction("getDatabaseInfo").then((result) => {
            setInfo(result.data);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }

    useEffect(() => {
        handleFetchInfo();
        return addAction("backup", {
            component: () => (
                <Button
                    onClick={handleBackup}
                    size={"large"}
                    variant='contained'
                    startIcon={<DatabaseBackup size={24} />}>
                    Backup Database
                </Button>
            )
        })
    }, []);

    return (
        <PermissionSuspense permission={"can-see-db"}>
            <Stack flex={1} spacing={3}>
                {/* Header Section */}
                <Card
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}>
                    <CardContent>
                        <Stack direction={["column", "row"]} gap={2} justifyContent={"space-between"}>
                            <Stack
                                direction={"row"}
                                alignItems={["start", "start", "center"]}
                                gap={2}>
                                <Box sx={{
                                    p: 1.5,
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Database size={28} />
                                </Box>
                                <Stack>
                                    <Typography fontSize={24} fontWeight={800}>
                                        Database Manager
                                    </Typography>
                                    <Stack
                                        direction={"row"}
                                        alignItems={"start"}
                                        gap={1}
                                        flexWrap={"wrap"}>
                                        <Chip
                                            label={`Size: ${formatFileSize(info?.size || 0)}`}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        />
                                        <Chip
                                            label={`Last Backup: ${info?.lastBackup ? formatDateFromEpoch(info?.lastBackup) : 'N/A'}`}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        />
                                        <Typography></Typography>
                                    </Stack>
                                </Stack>
                            </Stack>
                            <ActionView minWidth={'md'} id='backup' />
                        </Stack>
                    </CardContent>
                </Card>

                {/* Tabs Section */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        background: alpha(theme.palette.primary.main, 0.05)
                    }}>
                    <Tabs
                        value={value}
                        onChange={handleChange}
                        aria-label="tabs"
                        sx={{
                            '& .MuiTab-root': {
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: '16px',
                                minHeight: '40px'
                            },
                            '& .Mui-selected': {
                                color: theme.palette.primary.main + '!important'
                            }
                        }}>
                        <Tab
                            icon={<TableIcon size={20} />}
                            iconPosition="start"
                            label={"Schema"}
                            {...a11yProps(0)}
                        />
                        <Tab
                            icon={<DatabaseZap size={20} />}
                            iconPosition="start"
                            label={"Query"}
                            {...a11yProps(1)}
                        />
                        <Tab
                            icon={<DatabaseBackup size={20} />}
                            iconPosition="start"
                            label={"Backups"}
                            {...a11yProps(1)}
                        />
                    </Tabs>
                </Paper>

                {/* Content Section */}
                <Stack flex={1}>
                    <TabPanel value={value} index={0} sx={{ px: [1, 1, 3], height: '100%' }}>
                        <TableSchema loading={loading} schema={info?.schema || []} onRefresh={handleFetchInfo} />
                    </TabPanel>
                    <TabPanel value={value} index={1} sx={{ px: [1, 1, 3], height: '100%' }}>
                        <QueryRunner schema={schema} />
                    </TabPanel>
                    <TabPanel value={value} index={2} sx={{ px: [1, 1, 3], height: '100%' }}>
                        <BackupDatabase />
                    </TabPanel>
                </Stack>
            </Stack>
        </PermissionSuspense>
    );
}