import SQLEditor from '@/components/SQLEditor';
import { invokeFunction } from '@/libs/websocket/invokeFunction';
import {
    Button,
    Paper,
    Stack,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Chip,
    Alert,
    Pagination,
    IconButton,
    Tooltip,
    Box
} from '@mui/material';
import { DatabaseZap, Zap, ChevronDown, ChevronUp, Copy, Download, AlertCircle } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { enqueueSnackbar } from 'notistack';
import CloseSnackbar from '@/components/ui/CloseSnackbar';

interface QueryResult {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTime: number;
    success: boolean;
    error?: string;
}

export default function QueryRunner({ schema }: { schema: Record<string, string[]> }) {

    const [open, setOpen] = useState(true);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [sql, setSQL] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const rowsPerPage = 10;

    const handleRunQuery = async () => {
        if (!sql.trim()) return;

        setLoading(true);
        try {
            const result = await invokeFunction("executeSQL", { sql });
            if (result.data?.success) {
                setResult({
                    columns: result.data?.columns || [],
                    rows: result.data?.rows || [],
                    rowCount: result.data?.rowCount || 0,
                    executionTime: result.data?.executionTime || 0,
                    success: true
                });
            } else {
                setResult({
                    columns: [],
                    rows: [],
                    rowCount: 0,
                    executionTime: 0,
                    success: false,
                    error: result.error || result.data?.error
                });
            }
            setOpen(false);
            setCurrentPage(1);
        } catch (error: any) {
            setResult({
                columns: [],
                rows: [],
                rowCount: 0,
                executionTime: 0,
                success: false,
                error: error.message || 'Unknown error occurred'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(sql);
        enqueueSnackbar("SQL dicopy ke klipbord", { variant: "success", action: CloseSnackbar })
    };

    const handleDownloadCSV = () => {
        if (!result || !result.rows.length) return;

        const headers = result.columns.join(',');
        const csvContent = result.rows.map(row =>
            result.columns.map(col => `"${row[col] || ''}"`).join(',')
        ).join('\n');

        const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'query_result.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const paginatedRows = result?.rows?.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    ) || [];

    const totalPages = Math.ceil((result?.rowCount || 0) / rowsPerPage);

    return (
        <Stack spacing={2}>
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
                        <DatabaseZap size={24} color="white" />
                    </Box>
                    <Stack>
                        <Typography fontSize={20} fontWeight={600}>SQL Query</Typography>
                        <Typography variant="caption" color="text.secondary">SQL Query Runner</Typography>
                    </Stack>
                </Stack>
                <Button
                    onClick={() => setOpen(prev => !prev)}
                    variant="contained"
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                    }}>
                    {open ? "Collapse" : "Expand"}
                </Button>
            </Stack>
            {/* <Stack
                component={Paper}
                elevation={0}
                direction={"row"}
                alignItems={"center"}
                spacing={1}
                p={2}
                borderRadius={2}
                boxShadow={0}
                justifyContent={"space-between"}
                sx={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Box sx={{
                        p: 1,
                        bgcolor: 'primary.main',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <DatabaseZap size={24} color="white" />
                    </Box>
                    <Typography fontSize={20} fontWeight={600}>SQL Query</Typography>
                </Stack>
                <Button
                    onClick={() => setOpen(prev => !prev)}
                    variant="contained"
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                    }}>
                    {open ? "Collapse" : "Expand"}
                </Button>
            </Stack> */}

            <AnimatePresence>
                {open && (
                    <motion.div
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}>
                        <Stack spacing={2} pb={1}>
                            <SQLEditor
                                height={'250px'}
                                value={sql}
                                schema={schema}
                                onChange={setSQL}
                            />

                            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems={"center"} pr={1}>
                                <Tooltip title="Copy SQL to clipboard">
                                    <IconButton onClick={handleCopyToClipboard}>
                                        <Copy size={16} />
                                    </IconButton>
                                </Tooltip>

                                <Button
                                    onClick={handleRunQuery}
                                    variant="contained"
                                    disabled={loading || !sql.trim()}
                                    startIcon={loading ? <CircularProgress size={16} /> : <Zap size={16} />}
                                    sx={{ borderRadius: 2 }}>
                                    {loading ? 'Running...' : 'Execute Query'}
                                </Button>
                            </Stack>
                        </Stack>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {result && !open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}>
                        <Paper elevation={2} sx={{ p: 2, borderRadius: 0 }}>
                            <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" fontWeight={600}>
                                        Query Results
                                    </Typography>

                                    <Stack direction="row" spacing={1} alignItems={"center"}>
                                        <Tooltip title="Download as CSV">
                                            <IconButton
                                                onClick={handleDownloadCSV}
                                                disabled={!result.rows.length}>
                                                <Download size={16} />
                                            </IconButton>
                                        </Tooltip>

                                        <Button
                                            onClick={() => setOpen(true)}
                                            variant="outlined">
                                            Edit Query
                                        </Button>
                                    </Stack>
                                </Stack>

                                {!result.success ? (
                                    <Alert severity="error" icon={<AlertCircle />}>
                                        <Typography fontWeight={600}>Error executing query:</Typography>
                                        {result.error}
                                    </Alert>
                                ) : (
                                    <>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Chip
                                                label={`${result.rowCount} rows`}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                            <Chip
                                                label={`${result.executionTime}ms`}
                                                size="small"
                                                color="secondary"
                                                variant="outlined"
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                Page {currentPage} of {totalPages}
                                            </Typography>
                                        </Stack>

                                        {result.rows.length > 0 ? (
                                            <>
                                                <TableContainer
                                                    component={Paper}
                                                    variant="outlined"
                                                    sx={{
                                                        maxHeight: expanded ? 'none' : 400,
                                                        overflow: 'auto'
                                                    }}>
                                                    <Table size="small" stickyHeader>
                                                        <TableHead>
                                                            <TableRow>
                                                                {result.columns.map((column, index) => (
                                                                    <TableCell key={index} sx={{ fontWeight: 600 }}>
                                                                        {column}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {paginatedRows.map((row, rowIndex) => (
                                                                <TableRow
                                                                    key={rowIndex}
                                                                    hover
                                                                    sx={{
                                                                        '&:nth-of-type(odd)': {
                                                                            backgroundColor: 'action.hover'
                                                                        }
                                                                    }}>
                                                                    {result.columns.map((column, colIndex) => (
                                                                        <TableCell key={colIndex}>
                                                                            {typeof row[column] === 'object'
                                                                                ? JSON.stringify(row[column])
                                                                                : String(row[column] || 'NULL')
                                                                            }
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>

                                                {result.rows.length > 10 && (
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Button
                                                            onClick={() => setExpanded(!expanded)}
                                                            startIcon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}>
                                                            {expanded ? 'Collapse' : 'Expand'} Table
                                                        </Button>

                                                        <Pagination
                                                            count={totalPages}
                                                            page={currentPage}
                                                            onChange={(_, page) => setCurrentPage(page)}
                                                            color="primary"
                                                            size="small"
                                                        />
                                                    </Stack>
                                                )}
                                            </>
                                        ) : (
                                            <Alert severity="info">
                                                Query executed successfully but returned no results.
                                            </Alert>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </Stack>
    );
}