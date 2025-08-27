import { useState, useEffect, useMemo } from 'react';
import {
    Grid,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Checkbox,
    Paper,
    TextField,
    Typography,
    Box,
    IconButton,
    Tooltip,
    Stack
} from '@mui/material';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from 'lucide-react';

type Item = {
    label: string;
    value: string;
};

type Props = {
    defineList: Item[];
    items: string[];
    onChange: (items: string[]) => void;
    showSearch?: boolean;
    maxHeight?: number;
    disabled?: boolean;
    titles?: {
        left?: string;
        right?: string;
    };
};

export default function TransferList({ defineList, items, onChange, showSearch = false, maxHeight = 300, disabled = false, titles = { left: 'Available', right: 'Selected' } }: Props) {

    const [checked, setChecked] = useState<string[]>([]);
    const [left, setLeft] = useState<Item[]>([]);
    const [right, setRight] = useState<Item[]>([]);
    const [searchLeft, setSearchLeft] = useState('');
    const [searchRight, setSearchRight] = useState('');

    // Initialize lists based on props
    useEffect(() => {
        const rightItems = defineList.filter(i => items.includes(i.value));
        const leftItems = defineList.filter(i => !items.includes(i.value));
        setLeft(leftItems);
        setRight(rightItems);
    }, [defineList, items]);

    // Memoize the filtered lists to prevent unnecessary re-renders
    const filteredLeft = useMemo(() => {
        return !searchLeft
            ? left
            : left.filter(i =>
                i.label.toLowerCase().includes(searchLeft.toLowerCase())
            );
    }, [left, searchLeft]);

    const filteredRight = useMemo(() => {
        return !searchRight
            ? right
            : right.filter(i =>
                i.label.toLowerCase().includes(searchRight.toLowerCase())
            );
    }, [right, searchRight]);

    const leftChecked = useMemo(() =>
        left.filter(i => checked.includes(i.value)), [left, checked]);
    const rightChecked = useMemo(() =>
        right.filter(i => checked.includes(i.value)), [right, checked]);

    const toggleCheck = (val: string) => {
        if (disabled) return;
        setChecked(prev =>
            prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
        );
    };

    const handleToggleAll = (items: Item[], checkedItems: Item[]) => {
        if (disabled) return;

        const allValues = items.map(i => i.value);
        const allChecked = checkedItems.length === items.length;

        if (allChecked) {
            setChecked(prev => prev.filter(v => !allValues.includes(v)));
        } else {
            setChecked(prev => [...new Set([...prev, ...allValues])]);
        }
    };

    const moveAll = (from: Item[], to: Item[], setFrom: any, setTo: any) => {
        if (disabled) return;
        const newTo = [...to, ...from];
        const newFrom: Item[] = [];

        setTo(newTo);
        setFrom(newFrom);
        setChecked(prev => prev.filter(v => !from.some(f => f.value === v)));

        // Call onChange with the new right values
        onChange(newTo.map(item => item.value));
    };

    const moveChecked = (from: Item[], to: Item[], checkedItems: Item[], setFrom: any, setTo: any) => {
        if (disabled) return;
        const newTo = [...to, ...checkedItems];
        const newFrom = from.filter(i => !checkedItems.some(c => c.value === i.value));

        setTo(newTo);
        setFrom(newFrom);
        setChecked(prev => prev.filter(v => !checkedItems.some(c => c.value === v)));

        // Call onChange with the new right values
        onChange(newTo.map(item => item.value));
    };

    const clearSearch = (setSearch: (s: string) => void) => {
        setSearch('');
    };

    const CustomList = ({
        title,
        items,
        filteredItems,
        search,
        setSearch,
        checkedItems
    }: {
        title: string;
        items: Item[];
        filteredItems: Item[];
        search: string;
        setSearch: (s: string) => void;
        checkedItems: Item[];
    }) => (
        <Paper
            sx={{
                width: 240,
                height: maxHeight,
                display: 'flex',
                flexDirection: 'column',
                opacity: disabled ? 0.6 : 1
            }}>
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight="medium">
                    {title} ({items.length})
                </Typography>
            </Box>

            {showSearch && (
                <Box sx={{ p: 1, position: 'relative' }}>
                    <TextField
                        variant="outlined"
                        size="small"
                        placeholder={`Search ${title.toLowerCase()}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        fullWidth
                        disabled={disabled}
                        InputProps={{
                            startAdornment: <Search size={16} style={{ marginRight: 8, color: 'text.secondary' }} />,
                            endAdornment: search && (
                                <IconButton
                                    size="small"
                                    onClick={() => clearSearch(setSearch)}
                                    disabled={disabled}
                                    sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    <X size={16} />
                                </IconButton>
                            )
                        }}
                        sx={{
                            '& .MuiInputBase-input': {
                                paddingLeft: showSearch ? '40px' : '14px',
                                paddingRight: search ? '40px' : '14px'
                            }
                        }}
                    />
                </Box>
            )}

            {items.length > 0 && filteredItems.length === 0 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        No results found
                    </Typography>
                </Box>
            )}

            <Stack flex={1} overflow={"auto"}>
                <List dense>
                    {filteredItems.map(item => {
                        const labelId = `transfer-list-item-${item.value}`;
                        return (
                            <ListItemButton
                                key={item.value}
                                role="listitem"
                                onClick={() => toggleCheck(item.value)}
                                disabled={disabled}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Checkbox
                                        checked={checked.includes(item.value)}
                                        tabIndex={-1}
                                        disableRipple
                                        disabled={disabled}
                                        inputProps={{ 'aria-labelledby': labelId }}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    id={labelId}
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.875rem',
                                        noWrap: true,
                                        title: item.label
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Stack>

            {items.length > 0 && (
                <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                    <ListItemButton
                        onClick={() => handleToggleAll(filteredItems, checkedItems)}
                        disabled={disabled || filteredItems.length === 0}
                        dense>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Checkbox
                                checked={checkedItems.length === filteredItems.length && filteredItems.length > 0}
                                indeterminate={checkedItems.length > 0 && checkedItems.length < filteredItems.length}
                                disabled={disabled || filteredItems.length === 0}
                            />
                        </ListItemIcon>
                        <ListItemText
                            primary={`Select ${checkedItems.length === filteredItems.length ? 'none' : 'all'}`}
                            primaryTypographyProps={{ fontSize: '0.75rem', color: 'text.secondary' }}
                        />
                    </ListItemButton>
                </Box>
            )}
        </Paper>
    );

    return (
        <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <Grid>
                <CustomList
                    title={titles.left || 'Available'}
                    items={left}
                    filteredItems={filteredLeft}
                    search={searchLeft}
                    setSearch={setSearchLeft}
                    checkedItems={leftChecked}
                />
            </Grid>

            <Grid>
                <Grid container direction="column" alignItems="center" spacing={1}>
                    <Grid>
                        <Tooltip title="Move all to selected">
                            <span>
                                <IconButton
                                    onClick={() => moveAll(left, right, setLeft, setRight)}
                                    disabled={disabled || left.length === 0}
                                    color="primary"
                                    size="large">
                                    <ChevronsRight size={20} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Grid>
                    <Grid>
                        <Tooltip title="Move selected to right">
                            <span>
                                <IconButton
                                    onClick={() => moveChecked(left, right, leftChecked, setLeft, setRight)}
                                    disabled={disabled || leftChecked.length === 0}
                                    color="primary"
                                    size="large">
                                    <ChevronRight size={20} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Grid>
                    <Grid>
                        <Tooltip title="Move selected to left">
                            <span>
                                <IconButton
                                    onClick={() => moveChecked(right, left, rightChecked, setRight, setLeft)}
                                    disabled={disabled || rightChecked.length === 0}
                                    color="primary"
                                    size="large">
                                    <ChevronLeft size={20} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Grid>
                    <Grid>
                        <Tooltip title="Move all to available">
                            <span>
                                <IconButton
                                    onClick={() => moveAll(right, left, setRight, setLeft)}
                                    disabled={disabled || right.length === 0}
                                    color="primary"
                                    size="large">
                                    <ChevronsLeft size={20} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Grid>

            <Grid>
                <CustomList
                    title={titles.right || 'Selected'}
                    items={right}
                    filteredItems={filteredRight}
                    search={searchRight}
                    setSearch={setSearchRight}
                    checkedItems={rightChecked}
                />
            </Grid>
        </Grid>
    );
}