'use client'

import {
    Paper,
    Stack,
    Typography,
    Box,
    useTheme,
    Tabs,
    Tab,
} from "@mui/material";
import { ChartArea, FolderRoot, Settings, Users2 } from "lucide-react";
import Container from "@/components/Container";
import StickyHeader from "@/components/navigation/StickyHeader";
import PermissionSuspense from "@/components/PermissionSuspense";
import StorageSummary from "@/components/analistic/StorageSummary";
import UsersDrive from "./ui/UsersDrive";
import DriveConfig from "./ui/DriveConfig";
import useLocalStorage from "@/hooks/useLocalstorage";


export default function Page() {

    const theme = useTheme();
    const [value, setValue] = useLocalStorage("drive-metrics-tab", 1);
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <Container key={'layout'} maxWidth={"xl"} scrollable>
            {/* Sticky Header */}
            <StickyHeader canGoBack>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <FolderRoot size={28} color={theme.palette.primary.main} />
                    <Typography fontSize={22} fontWeight={700}>
                        Drive Metrics
                    </Typography>
                </Stack>
            </StickyHeader>

            <Stack component={Paper} borderRadius={2} sx={{ minHeight: '100dvh', p: 2, background: 'transparent', backdropFilter: 'blur(10px)' }}>

                <Box sx={{
                    backgroundColor: 'rgba(141, 141, 141, 0.05)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 1,
                    boxShadow: 2,
                    pt: 1
                }}>
                    <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                        <Tab label={<ChartArea size={20} />} value={1} sx={{ px: 2 }} />
                        <Tab label={<Users2 size={20} />} value={2} sx={{ px: 2 }} />
                        <Tab label={<Settings size={20} />} value={3} sx={{ px: 2 }} />
                    </Tabs>
                </Box>

                <Stack flex={1} sx={{ mt: 1 }}>
                    {value == 1 ? (
                        <PermissionSuspense permission={"can-see-drive-root"}>
                            <StorageSummary />
                        </PermissionSuspense>
                    ) : value == 2 ? (
                        <PermissionSuspense permission={"can-list-user"}>
                            <UsersDrive />
                        </PermissionSuspense>
                    ) : (
                        <PermissionSuspense permission={"can-manage-drive-root"}>
                            <DriveConfig />
                        </PermissionSuspense>
                    )}
                </Stack>
            </Stack>
        </Container>
    );
}
