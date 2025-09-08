'use client'

import React, { useState, ReactElement, useMemo } from 'react';
import {
    Menu as MuiMenu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Divider,
    IconButtonProps,
    MenuProps as MuiMenuProps,
    SxProps,
    Theme,
    alpha
} from '@mui/material';
import { Funnel, LucideIcon } from 'lucide-react';
import { ColorName, getColor } from '@/theme/colors';

interface MenuItemBase {
    label: string;
    sx?: SxProps<Theme>;
    activeColor?: ColorName & "inherit";
}

interface MenuItemDivider {
    type: 'divider';
}

interface MenuItemAction extends MenuItemBase {
    icon?: LucideIcon;
    action: () => void;
    active?: boolean;
}

export type AnchorMenuItem = MenuItemAction | MenuItemDivider;

interface MenuProps {
    items?: (AnchorMenuItem | false)[];
    children?: ReactElement;
    buttonProps?: Partial<IconButtonProps>;
    menuProps?: Partial<MuiMenuProps>;
}

const AnchorMenu: React.FC<MenuProps> = ({
    items: menuItems = [],
    children,
    buttonProps = {},
    menuProps = {}
}) => {
    const items = useMemo<AnchorMenuItem[]>(() => menuItems.filter(Boolean) as any, [menuItems]);
    const active = items.find(i => (i as MenuItemAction)?.active) as MenuItemAction | undefined;

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleItemClick = (action?: () => void) => {
        if (action) {
            action();
        }
        handleClose();
    };

    return (
        <>
            {children ? (
                React.cloneElement(children, {
                    onClick: handleClick,
                    ...buttonProps
                })
            ) : (
                <IconButton
                    onClick={handleClick} {...buttonProps as IconButtonProps}
                    sx={{
                        ...(active && {
                            background: active.activeColor == "inherit" ? "inherit" : alpha(getColor(active.activeColor || 'primary')[400], 0.2)
                        })
                    }}>
                    <Funnel size={16} />
                </IconButton>
            )}

            <MuiMenu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                {...menuProps}>
                {items.map((item, index) => {
                    if ('type' in item && item.type === 'divider') {
                        return <Divider key={`divider-${index}`} />;
                    }

                    const menuItem = item as MenuItemAction;
                    const { icon: Icon, label, action, active, activeColor = 'primary', sx = {} } = menuItem;

                    return (
                        <MenuItem
                            key={label || `item-${index}`}
                            sx={(theme) => ({
                                bgcolor: active ? getColor(activeColor)[400] : "",
                                color: active ? "#fff" : "",
                                "&:hover": {
                                    bgcolor: active ? getColor(activeColor)[500] : alpha(getColor(activeColor)[200], 0.5),
                                },
                                ...theme.applyStyles('dark', {
                                    color: active ? "#fff" : "",
                                })
                            })}
                            onClick={() => handleItemClick(action)}>
                            {Icon && (
                                <ListItemIcon style={{ color: 'currentcolor' }} >
                                    <Icon size={18} style={{ color: 'currentcolor' }} />
                                </ListItemIcon>
                            )}
                            <ListItemText>
                                {label}
                            </ListItemText>
                        </MenuItem>
                    );
                })}
            </MuiMenu>
        </>
    );
};

export default AnchorMenu;