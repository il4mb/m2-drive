import { useState, useEffect, useMemo, useRef } from 'react';
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
    Stack,
    InputAdornment
} from '@mui/material';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from 'lucide-react';

export type TransferListItem<T extends string = string> = {
    label: string;
    value: T;
    parent?: string;
};

type Props<T extends string> = {
    defineList: readonly TransferListItem<T>[];
    items: T[];
    onChange: (items: T[]) => void;
    showSearch?: boolean;
    maxHeight?: number;
    disabled?: boolean;
    titles?: {
        left?: string;
        right?: string;
    };
};

export default function TransferList<T extends string>({
    defineList,
    items,
    onChange,
    showSearch = true,
    maxHeight = 300,
    disabled = false,
    titles = { left: 'Available', right: 'Selected' }
}: Props<T>) {
    const [checked, setChecked] = useState<string[]>([]);
    const [left, setLeft] = useState<TransferListItem[]>([]);
    const [right, setRight] = useState<TransferListItem[]>([]);
    const [leftSearch, setLeftSearch] = useState('');
    const [rightSearch, setRightSearch] = useState('');

    // Refs to track scroll positions
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLeft(prev => {
            const existingMap = new Map(prev.map(i => [i.value, i]));
            return defineList.filter(i => !items.includes(i.value))
                .map(i => existingMap.get(i.value) || i); // keep same ref if exists
        });
        setRight(prev => {
            const existingMap = new Map(prev.map(i => [i.value, i]));
            return defineList.filter(i => items.includes(i.value))
                .map(i => existingMap.get(i.value) || i);
        });
    }, [defineList, items]);

    const leftChecked = useMemo(() => left.filter(i => checked.includes(i.value)), [left, checked]);
    const rightChecked = useMemo(() => right.filter(i => checked.includes(i.value)), [right, checked]);

    const filteredLeft = useMemo(() => {
        if (!leftSearch) return left;
        return left.filter(item =>
            item.label.toLowerCase().includes(leftSearch.toLowerCase())
        );
    }, [left, leftSearch]);


    const filteredRight = useMemo(() => {
        if (!rightSearch) return right;
        return right.filter(item =>
            item.label.toLowerCase().includes(rightSearch.toLowerCase())
        );
    }, [right, rightSearch]);


    const toggleCheck = (val: string) => {
        if (disabled) return;

        setChecked(prev => {
            const isChecked = prev.includes(val);

            const getChildren = (parentVal: string): string[] => {
                return defineList
                    .filter(item => item.parent === parentVal)
                    .map(item => item.value);
            };

            const getParent = (childVal: string): string | undefined => {
                return defineList.find(item => item.value === childVal)?.parent;
            };

            // Prevent uncheck if parent is checked
            if (!isChecked) {
                // --- CHECKING ---
                const newChecked = new Set(prev);
                newChecked.add(val);

                // Recursively check all children
                const stack = [val];
                while (stack.length) {
                    const current = stack.pop()!;
                    const children = getChildren(current);
                    for (const child of children) {
                        if (!newChecked.has(child)) {
                            newChecked.add(child);
                            stack.push(child);
                        }
                    }
                }
                return Array.from(newChecked);
            } else {
                // --- UNCHECKING ---
                const parent = getParent(val);
                if (parent && prev.includes(parent)) {
                    // Ignore uncheck if parent still checked
                    return prev;
                }

                // Normal uncheck
                return prev.filter(v => v !== val);
            }
        });
    }


    const handleToggleAll = (itemsToToggle: TransferListItem[], shouldCheck: boolean) => {
        if (disabled) return;

        if (shouldCheck) {
            // Check all items in the current list
            const newChecked = [...checked];
            itemsToToggle.forEach(item => {
                if (!newChecked.includes(item.value)) {
                    newChecked.push(item.value);
                }
            });
            setChecked(newChecked);
        } else {
            // Uncheck all items in the current list
            setChecked(checked.filter(val =>
                !itemsToToggle.some(item => item.value === val)
            ));
        }
    };

    const selectAll = () => {
        onChange(defineList.map(e => e.value));
        setChecked([]);
    };

    const unselectAll = () => {
        onChange([]);
        setChecked([]);
    };

    const selectChecked = () => {
        const newItems = [...items, ...leftChecked.map(e => e.value)];
        onChange(newItems as T[]);
        setChecked(checked.filter(val => !leftChecked.some(item => item.value === val)));
    };

    const unselectChecked = () => {
        const selectedValues = rightChecked.map(e => e.value);
        const filtered = items.filter(e => !selectedValues.includes(e));
        onChange(filtered);
        setChecked(checked.filter(val => !rightChecked.some(item => item.value === val)));
    };

    const clearSearch = (side: 'left' | 'right') => {
        if (side === 'left') {
            setLeftSearch('');
        } else {
            setRightSearch('');
        }
    };


    return (
        <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <Grid size={5.5}>
                <CustomList
                    checked={checked}
                    toggleCheck={toggleCheck}
                    disabled={disabled}
                    maxHeight={maxHeight}
                    title={titles.left || 'Available'}
                    items={filteredLeft}
                    checkedItems={leftChecked}
                    searchTerm={leftSearch}
                    onSearchChange={setLeftSearch}
                    showSearch={showSearch}
                    onToggleAll={(shouldCheck) => handleToggleAll(filteredLeft, shouldCheck)}
                    scrollRef={leftScrollRef}
                />
            </Grid>

            <Grid>
                <Grid container direction="column" alignItems="center" spacing={1}>
                    <Grid>
                        <Tooltip title="Move all to selected">
                            <span>
                                <IconButton
                                    onClick={selectAll}
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
                                    onClick={selectChecked}
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
                                    onClick={unselectChecked}
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
                                    onClick={unselectAll}
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

            <Grid size={5.5}>
                <CustomList
                    checked={checked}
                    toggleCheck={toggleCheck}
                    disabled={disabled}
                    maxHeight={maxHeight}
                    title={titles.right || 'Selected'}
                    items={filteredRight}
                    checkedItems={rightChecked}
                    searchTerm={rightSearch}
                    onSearchChange={setRightSearch}
                    showSearch={showSearch}
                    onToggleAll={(shouldCheck) => handleToggleAll(filteredRight, shouldCheck)}
                    scrollRef={rightScrollRef}
                />
            </Grid>
        </Grid>
    );
}

type CustomProps = {
    title: string;
    items: TransferListItem[];
    checkedItems: TransferListItem[];
    searchTerm: string;
    showSearch: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    maxHeight?: number;
    disabled?: boolean;
    checked: string[];
    onSearchChange: (term: string) => void;
    onToggleAll: (shouldCheck: boolean) => void;
    toggleCheck: (value: string) => void;
};

const CustomList = ({
    title,
    items,
    checkedItems,
    searchTerm,
    showSearch,
    scrollRef,
    maxHeight,
    disabled,
    checked,
    onToggleAll,
    onSearchChange,
    toggleCheck
}: CustomProps) => {

    const allChecked = items.length > 0 && checkedItems.length === items.length;
    const indeterminate = checkedItems.length > 0 && checkedItems.length < items.length;

    return (
        <Paper
            sx={{
                width: '100%',
                height: maxHeight,
                display: 'flex',
                flexDirection: 'column',
                opacity: disabled ? 0.6 : 1
            }}>
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight="medium">
                    {title} ({items.length})
                </Typography>

                {showSearch && (
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        sx={{ mt: 1 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => onSearchChange('')}
                                            disabled={disabled}>
                                            <X size={16} />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
                )}
            </Box>

            {items.length > 0 && (
                <Box sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    pl: 1,
                    pr: 1,
                    height: 48
                }}>
                    <Checkbox
                        checked={allChecked}
                        indeterminate={indeterminate}
                        onChange={(e) => onToggleAll(e.target.checked)}
                        disabled={disabled}
                    />
                    <Typography variant="body2" color="textSecondary">
                        {checkedItems.length} selected
                    </Typography>
                </Box>
            )}

            <Stack
                flex={1}
                overflow={"auto"}
                ref={scrollRef}>
                <List dense sx={{ pt: 0 }}>
                    {items.map(item => {
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
                                        slotProps={{
                                            input: {
                                                'aria-labelledby': labelId
                                            }
                                        }}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    id={labelId}
                                    primary={item.label}
                                    slotProps={{
                                        primary: {
                                            fontSize: '0.875rem',
                                            noWrap: true,
                                            title: item.label
                                        }
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Stack>
        </Paper>
    );
};
