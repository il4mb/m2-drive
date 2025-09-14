import { Drawer, Box, Typography, IconButton, Chip, Divider, List, ListItem, ListItemText, ListItemIcon, Avatar, Tooltip } from "@mui/material";
import { createContextMenu } from "../context-menu/ContextMenuItem";
import { Info, X, FileText, Folder, User, Users, Calendar, Clock, Download, Star, Trash2, Share2, Tag, Image, Edit, Eye } from "lucide-react";
import { File } from "@/entities/File";
import useUser from "@/hooks/useUser";
import { useContributors } from "@/hooks/useContributors";
import { useTheme } from "@mui/material/styles";
import { formatFileSize, formatDateFromEpoch } from "@/libs/utils";
import useDarkMode from "@/hooks/useDarkMode";
import UserAvatar from "../ui/UserAvatar";

export default createContextMenu<{ file: File }>({
    icon: Info,
    label: ({ state }) => (
        `Detail ${state.file.type[0].toUpperCase() + state.file.type.slice(1)}`
    ),
    component({ state, resolve }) {
        const { file } = state;
        const { user: owner } = useUser(file.uId);
        const { contributors } = useContributors(file.id);
        const theme = useTheme();

        const isDark = useDarkMode();
        const meta = file.meta || {};
        const isFolder = file.type === 'folder';

        return (
            <Drawer
                anchor="right"
                open
                onClose={() => resolve(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: '100%',
                            maxWidth: 400,
                            bgcolor: isDark ? 'grey.900' : 'background.paper',
                            color: isDark ? 'grey.100' : 'text.primary',
                        }
                    }
                }}>
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    p={2}
                    borderBottom="1px solid"
                    borderColor="divider">
                    <Typography variant="h6" component="h2">
                        {isFolder ? "📁 Detail Folder" : "📄 Detail File"}
                    </Typography>
                    <IconButton
                        onClick={() => resolve(false)}
                        sx={{ color: isDark ? 'grey.400' : 'grey.600' }}>
                        <X size={20} />
                    </IconButton>
                </Box>

                <Box p={2} flex={1} overflow="auto">
                    {/* Basic Information */}
                    <Box mb={3}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isFolder ? <Folder size={18} /> : <FileText size={18} />}
                            Informasi Dasar
                        </Typography>

                        <List dense sx={{ bgcolor: isDark ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                            <ListItem>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <FileText size={16} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Nama"
                                    secondary={file.name}
                                    secondaryTypographyProps={{
                                        sx: {
                                            wordBreak: 'break-word',
                                            color: isDark ? 'grey.300' : 'grey.700'
                                        }
                                    }}
                                />
                            </ListItem>

                            <ListItem>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {isFolder ? <Folder size={16} /> : <FileText size={16} />}
                                </ListItemIcon>
                                <ListItemText
                                    primary="Tipe"
                                    secondary={isFolder ? 'Folder' : 'File'}
                                    secondaryTypographyProps={{
                                        sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                    }}
                                />
                            </ListItem>


                            {!isFolder && (meta as any).mimeType && (
                                <ListItem>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Image size={16} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Tipe MIME"
                                        secondary={(meta as any).mimeType}
                                        secondaryTypographyProps={{
                                            sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                        }}
                                    />
                                </ListItem>
                            )}

                            {!isFolder && (meta as any).size && (
                                <ListItem>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Download size={16} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Ukuran"
                                        secondary={formatFileSize((meta as any).size)}
                                        secondaryTypographyProps={{
                                            sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                        }}
                                    />
                                </ListItem>
                            )}

                            {isFolder && (meta as any).itemCount !== undefined && (
                                <ListItem>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <FileText size={16} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Jumlah Item"
                                        secondary={`${(meta as any).itemCount} item`}
                                        secondaryTypographyProps={{
                                            sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                        }}
                                    />
                                </ListItem>
                            )}
                        </List>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Timestamps */}
                    <Box mb={3}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={18} />
                            Informasi Waktu
                        </Typography>

                        <List dense sx={{ bgcolor: isDark ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                            <ListItem>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Clock size={16} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Dibuat"
                                    secondary={
                                        <Tooltip title={formatDateFromEpoch(file.createdAt)}>
                                            <span>{formatDateFromEpoch(file.createdAt)}</span>
                                        </Tooltip>
                                    }
                                    secondaryTypographyProps={{
                                        sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                    }}
                                />
                            </ListItem>

                            {file.updatedAt && (
                                <ListItem>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Edit size={16} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Diperbarui"
                                        secondary={
                                            <Tooltip title={formatDateFromEpoch(file.updatedAt)}>
                                                <span>{formatDateFromEpoch(file.updatedAt)}</span>
                                            </Tooltip>
                                        }
                                        secondaryTypographyProps={{
                                            sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                        }}
                                    />
                                </ListItem>
                            )}

                            {meta.lastOpened && (
                                <ListItem>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Eye size={16} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Terakhir Dibuka"
                                        secondary={formatDateFromEpoch(meta.lastOpened)}
                                        secondaryTypographyProps={{
                                            sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                        }}
                                    />
                                </ListItem>
                            )}
                        </List>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Metadata */}
                    <Box mb={3}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Info size={18} />
                            Metadata
                        </Typography>

                        <Box sx={{ bgcolor: isDark ? 'grey.800' : 'grey.50', borderRadius: 1, p: 2 }}>
                            {meta.description && (
                                <Box mb={2}>
                                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                                        Deskripsi:
                                    </Typography>
                                    <Typography variant="body2" sx={{
                                        color: isDark ? 'grey.300' : 'grey.700',
                                        lineHeight: 1.5
                                    }}>
                                        {meta.description}
                                    </Typography>
                                </Box>
                            )}

                            {meta.tags && meta.tags.length > 0 && (
                                <Box mb={2}>
                                    <Typography variant="body2" fontWeight="medium" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Tag size={14} />
                                        Tag:
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                        { //@ts-ignore
                                            (meta?.tags || []).map((tag, index) => (
                                                <Chip
                                                    key={index}
                                                    label={tag}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        fontSize: '0.7rem',
                                                        bgcolor: isDark ? 'grey.700' : 'grey.200',
                                                        borderColor: isDark ? 'grey.600' : 'grey.300'
                                                    }}
                                                />
                                            ))}
                                    </Box>
                                </Box>
                            )}

                            <Box display="flex" flexWrap="wrap" gap={1}>
                                {["editor", "viewer"].includes((meta as any).generalPermit) && (
                                    <Chip
                                        icon={<Share2 size={14} />}
                                        label="Dibagikan"
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                    />
                                )}

                                {meta.trashed && (
                                    <Chip
                                        icon={<Trash2 size={14} />}
                                        label="Sampah"
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                    />
                                )}

                                {["editor", "viewer"].includes((meta as any).generalPermit) && (
                                    <Chip
                                        icon={meta.generalPermit === 'editor' ? <Edit size={14} /> : <Eye size={14} />}
                                        label={meta.generalPermit === 'editor' ? 'Editor' : 'Viewer'}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Ownership & Sharing */}
                    <Box mb={3}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Users size={18} />
                            Kepemilikan & Berbagi
                        </Typography>

                        <List component={"div"} dense sx={{ bgcolor: isDark ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                            <ListItem component={"div"}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <UserAvatar size={30} userId={file.uId} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Pemilik"
                                    secondary={owner?.name || file.uId}
                                    secondaryTypographyProps={{
                                        sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                    }}
                                />
                            </ListItem>
                            {contributors.map((c, i) => (
                                <ListItem component={"div"} key={c.id}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <UserAvatar size={30} userId={c.userId} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={c.user.name}
                                        secondary={`${c.role}`}
                                        secondaryTypographyProps={{
                                            sx: { color: isDark ? 'grey.300' : 'grey.700' }
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>

                    {/* Technical Info */}
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Info size={18} />
                            Informasi Teknis
                        </Typography>

                        <List dense sx={{ bgcolor: isDark ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                            <ListItem>
                                <ListItemText
                                    primary="ID File"
                                    secondary={file.id}
                                    secondaryTypographyProps={{
                                        sx: {
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            color: isDark ? 'grey.300' : 'grey.700'
                                        }
                                    }}
                                />
                            </ListItem>

                            <ListItem>
                                <ListItemText
                                    primary="ID Pemilik"
                                    secondary={file.uId}
                                    secondaryTypographyProps={{
                                        sx: {
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            color: isDark ? 'grey.300' : 'grey.700'
                                        }
                                    }}
                                />
                            </ListItem>

                            {file.pId && (
                                <ListItem>
                                    <ListItemText
                                        primary="ID Folder Induk"
                                        secondary={file.pId}
                                        secondaryTypographyProps={{
                                            sx: {
                                                fontFamily: 'monospace',
                                                fontSize: '0.8rem',
                                                color: isDark ? 'grey.300' : 'grey.700'
                                            }
                                        }}
                                    />
                                </ListItem>
                            )}
                        </List>
                    </Box>
                </Box>
            </Drawer>
        );
    }
});