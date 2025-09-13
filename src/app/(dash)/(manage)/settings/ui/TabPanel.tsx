import { SxProps } from "@mui/material";
import { Box } from "@mui/system";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
    sx?: SxProps;
}

export function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <Box
            component={"div"}
            flex={1}
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}>
            {value === index && <Box>{children}</Box>}
        </Box>
    );
}


export function a11yProps(index: number) {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`,
    };
}