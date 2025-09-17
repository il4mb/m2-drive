'use client'

import { Box, Paper, Stack, Tabs, Typography, Tab } from "@mui/material";
import { Database, Settings, ShieldUser } from "lucide-react";
import RoleManager from "./ui/RoleManager";
import Container from "@/components/Container";
import { useState } from "react";
import DatabaseManager from "./ui/database/DatabaseManager";
import PermissionSuspense from "@/components/PermissionSuspense";
import { a11yProps, TabPanel } from "@/app/(dash)/(manage)/settings/ui/TabPanel";

export default function page() {

    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    }

    return (
        <Container maxWidth={"xl"} scrollable>

            <Stack component={Paper} p={2} mb={2} position={"sticky"} top={0} zIndex={10} boxShadow={2} borderRadius={2}>
                <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"}>
                    <Stack direction={"row"} spacing={1} alignItems={"center"}>
                        <Settings size={28} />
                        <Typography fontSize={22} fontWeight={600}>
                            Pengaturan
                        </Typography>
                    </Stack>
                </Stack>
            </Stack>

            <Stack component={Paper} borderRadius={2} flex={1}>

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                        <Tab label={
                            <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                <ShieldUser size={16} />
                                <Typography>Role Manager</Typography>
                            </Stack>
                        } {...a11yProps(0)} />
                        <Tab label={
                            <Stack direction={"row"} spacing={1} alignItems={"center"}>
                                <Database size={16} />
                                <Typography>Database Manager</Typography>
                            </Stack>
                        } {...a11yProps(1)} />
                    </Tabs>
                </Box>
                <Stack flex={1} p={[2, 2, 3]}>
                    <TabPanel value={value} index={0}>
                        <PermissionSuspense permission={"can-see-role"}>
                            <RoleManager />
                        </PermissionSuspense>
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        <PermissionSuspense permission={"can-see-db"}>
                            <DatabaseManager />
                        </PermissionSuspense>
                    </TabPanel>
                </Stack>
            </Stack>
        </Container>
    );
}
