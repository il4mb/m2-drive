'use client'

import { IconButton, Tooltip, useColorScheme } from '@mui/material';
import useDarkMode from '../hooks/useDarkMode';
import { Moon, Sun } from 'lucide-react';



export default function ThemeToggle() {

    const isDark = useDarkMode();
    const { setMode } = useColorScheme();

    const handleToggle = () => {
        setMode(isDark ? "light" : "dark");
    }

    return (
        <Tooltip title={isDark ? "Mode terang" : "Mode gelap"} arrow>
            <IconButton onClick={handleToggle}>
                {!isDark ? <Moon size={20} /> : <Sun size={20} />}
            </IconButton>
        </Tooltip>
    );
}