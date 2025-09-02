'use client';

import { useMemo, useState } from 'react';
import { Stack, Typography, Button, TextField, List, ListItem, ListItemText, IconButton, Avatar, MenuItem, LinearProgress } from '@mui/material';
import User from '@/entity/User';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { File } from '@/entity/File';
import { useContributors } from '@/hooks/useContributors';
import { useUsers } from '@/hooks/useUsers';
import UserAvatar from './ui/UserAvatar';

type ContributorManagerProps = {
    file: File;
}
const ContributorManager = ({ file }: ContributorManagerProps) => {

    const [open, setOpen] = useState(false);
    const { contributors, loading: loading2, addContributor, updateContributor, removeContributor } = useContributors(file.id);
    const [keyword, setKeyword] = useState('');
    const exclude = useMemo(() => [file.uId, ...contributors.map(e => e.userId)].filter(e => e != null), [file, contributors]);
    const { users, loading } = useUsers({ keyword, exclude, limit: 6 });

    const handleAddContributor = async (user: User) => {
        await addContributor(user.id, "viewer");
        setKeyword('');
    }

    return (
        <Stack spacing={1} mb={2} minHeight={100}>
            <Typography fontSize={16}>
                Kontributor:
            </Typography>

            <Stack flex={1} sx={{ position: "relative" }}>
                <AnimatePresence>
                    {loading2 && (
                        <LinearProgress key={'loading'} sx={{ position: 'absolute', top: 0, height: 2, left: 0, width: '100%' }} />
                    )}
                    {contributors.length === 0 && (
                        <motion.div
                            key="no-contributor"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2 }}
                            style={{ marginBottom: 20, marginTop: 20, flex: 1 }}>
                            <Typography color="text.secondary" ml={1}>
                                Tidak ada kontributor
                            </Typography>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    <List key={'list'} dense>
                        {contributors.map((c, i) => (
                            <motion.li
                                key={c.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.25 }}>

                                <ListItem
                                    secondaryAction={
                                        <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                            <TextField
                                                select
                                                variant="standard"
                                                sx={{
                                                    maxWidth: 200,
                                                    width: '100%',
                                                    '& .MuiInputBase-root:before': { borderBottom: 'none' },
                                                    '& .MuiInputBase-root:after': { borderBottom: 'none' },
                                                    '& .MuiInputBase-input': { paddingY: 1 },
                                                }}
                                                defaultValue="viewer"
                                                value={c.role}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateContributor(c.id, val as any);
                                                }}>
                                                <MenuItem value="viewer">Hanya Lihat</MenuItem>
                                                <MenuItem value="editor">Mengedit</MenuItem>
                                            </TextField>
                                            {open && (
                                                <IconButton onClick={() => removeContributor(c.id)}>
                                                    <X size={16} />
                                                </IconButton>
                                            )}
                                        </Stack>


                                    }>
                                    <UserAvatar userId={c.userId} size={35} sx={{ mr: 1 }} />
                                    <ListItemText primary={c.user?.name} secondary={c.user?.email} />
                                </ListItem>

                            </motion.li>
                        ))}
                    </List>
                </AnimatePresence>

                {open ? (
                    <motion.div
                        key="search-area"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}>
                        <Stack direction="column" gap={1} height={250}>
                            <Stack direction="row" spacing={1} alignItems="flex-end">
                                <TextField
                                    label="Cari pengguna..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    autoFocus
                                    fullWidth
                                />
                                <Button
                                    onClick={() => setOpen(false)}
                                    size="small"
                                    color="inherit">
                                    Batal
                                </Button>
                            </Stack>

                            <Stack flex={1} position={"relative"}>
                                {loading && (
                                    <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2 }} />
                                )}
                                <AnimatePresence>
                                    {users.length == 0 && !loading && (
                                        <Stack key={'empty'} flex={1} alignItems={"center"} justifyContent={"center"}>
                                            <Typography color='text.secondary'>Tidak ada hasil!</Typography>
                                        </Stack>
                                    )}
                                    <List key={'list'} dense>
                                        {users.map((u, i) => (
                                            <motion.li
                                                key={u.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ duration: 0.2, delay: 0.05 * i }}>
                                                <ListItem
                                                    onClick={() => handleAddContributor(u)}
                                                    secondaryAction={
                                                        <IconButton edge="end" onClick={() => handleAddContributor(u)}>
                                                            <Plus size={16} />
                                                        </IconButton>
                                                    }>
                                                    <Avatar src={u.meta.avatar} sx={{ mr: 1, width: 35, height: 35 }}>
                                                        {u.name?.[0]}
                                                    </Avatar>
                                                    <ListItemText primary={u.name} secondary={u.email} />
                                                </ListItem>
                                            </motion.li>
                                        ))}
                                    </List>
                                </AnimatePresence>
                            </Stack>
                        </Stack>
                    </motion.div>
                ) : (
                    <motion.div
                        key="add-btn"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            justifySelf: 'flex-end',
                            marginTop: 'auto'
                        }}>
                        <Button
                            onClick={() => setOpen(true)}
                            sx={{ alignSelf: 'end' }}
                            size="small"
                            variant="outlined">
                            Tambah K.
                        </Button>
                    </motion.div>
                )}
            </Stack>
        </Stack>
    );
};

export default ContributorManager;
