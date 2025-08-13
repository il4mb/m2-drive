import { useColorScheme } from "@mui/material";

export default function useDarkMode() {

    const { mode } = useColorScheme();

    return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}