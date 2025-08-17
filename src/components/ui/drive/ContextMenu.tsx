import { DriveFile } from '@/entity/DriveFile';
import { Divider, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { FileIcon } from '@untitledui/file-icons';
import { Copy, Edit, Folder, FolderOpen, MoveDiagonal, Pencil, Share2, SquareArrowOutUpRight, Trash } from 'lucide-react';
import { useDriveRoot } from './DriveRoot';
import ActionDelete from './menu-actions/ActionDelete';
import ActionCopy from './menu-actions/ActionCopy';

export interface ContextMenuProps {
    file: DriveFile;
    position: { x: number, y: number } | null;
    onClose?: () => void;
}
export default function ContextMenu({ file, position, onClose }: ContextMenuProps) {

    const { setFolder } = useDriveRoot();
    const open = Boolean(position);

    const handleOpen = () => {
        if (file.type == "folder") {
            setFolder(file);
        }

        onClose?.();
    }

    return (
        <Menu
            open={open}
            onClose={onClose}
            onContextMenu={(e) => (e.preventDefault(), onClose?.())}
            anchorReference="anchorPosition"
            anchorPosition={
                position !== null
                    ? { top: position.y, left: position.x }
                    : undefined
            }
            slotProps={{
                paper: {
                    sx: {
                        maxWidth: 180,
                        width: '100%'
                    }
                }
            }}>

            {/* HEADER */}
            <Stack direction={"row"} spacing={1} alignItems={"center"} pb={1}>
                {file.type == "folder"
                    ? <Folder strokeWidth={1} size={22} />
                    : <FileIcon variant='default' size={22} type={file.type} />
                }
                <Typography flex={1} fontSize={17} whiteSpace={'nowrap'} overflow={'hidden'} textOverflow={'ellipsis'}>
                    {file.name}
                </Typography>
            </Stack>

            {/* MENU */}
            <MenuItem onClick={handleOpen}>
                <FolderOpen size={16} />
                <Typography ml={1}>
                    Buka
                </Typography>
            </MenuItem>

            {file.type != "folder" && (
                <>
                    <MenuItem>
                        <SquareArrowOutUpRight size={16} />
                        <Typography ml={1}>
                            Buka Dengan
                        </Typography>
                    </MenuItem>
                </>
            )}

            <MenuItem>
                <Share2 size={14} />
                <Typography ml={1}>
                    Bagikan
                </Typography>
            </MenuItem>

            <Divider />

            <MenuItem>
                <Pencil size={14} />
                <Typography ml={1}>
                    Sunting
                </Typography>
            </MenuItem>

            <ActionCopy file={file} onClose={onClose}/>

            <MenuItem>
                <MoveDiagonal size={14} />
                <Typography ml={1}>
                    Pindah ke...
                </Typography>
            </MenuItem>
            <ActionDelete file={file} onClose={onClose} />

        </Menu>
    );
}