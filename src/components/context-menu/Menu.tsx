'use client'

import React, { useState, ReactElement } from 'react';
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
    activeColor?: ColorName;
}

interface MenuItemDivider {
    type: 'divider';
}

interface MenuItemAction extends MenuItemBase {
    icon?: LucideIcon;
    action: () => void;
    active?: boolean;
}

type MenuItemType = MenuItemAction | MenuItemDivider;

interface MenuProps {
    items?: MenuItemType[];
    children?: ReactElement;
    buttonProps?: Partial<IconButtonProps>;
    menuProps?: Partial<MuiMenuProps>;
}

const Menu: React.FC<MenuProps> = ({
    items = [],
    children,
    buttonProps = {},
    menuProps = {}
}) => {
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
                <IconButton onClick={handleClick} {...buttonProps as IconButtonProps}>
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

export default Menu;