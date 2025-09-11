'use client'

import { Alert, AlertTitle, Paper, Stack, Typography } from "@mui/material";
import { Settings } from "lucide-react";
import RoleManager from "./ui/RoleManager";
import Container from "@/components/Container";
import { useCheckMyPermissionState } from "@/components/context/CurrentUserAbilitiesProvider";
import UploadSizeManager from "./ui/UploadSizeManager";
import DriveSizeManager from "./ui/DriveSizeManager";

export default function page() {

    const checkPermission = useCheckMyPermissionState();
    const canSeeSettings = checkPermission("can-see-system-settings");

    return (
        <Container maxWidth="lg" scrollable>

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

            <Stack component={Paper} p={2} pt={4} pb={7} borderRadius={2}>

                {!canSeeSettings && (
                    <Alert severity="warning" sx={{ mb: 4 }} variant="outlined">
                        <AlertTitle>Kesalahan Wewenang</AlertTitle>
                        Kamu tidak memiliki wewenang untuk memodifikasi pengaturan sistem!
                    </Alert>
                )}
                {canSeeSettings && (
                    <>
                        <Stack mx={'auto'} maxWidth={800} width={'100%'} mb={8}>
                            <RoleManager />
                        </Stack>
                        {/* <Stack mx={'auto'} maxWidth={800} width={'100%'} mb={8}>
                            <DriveSizeManager />
                        </Stack>
                        <Stack mx={'auto'} maxWidth={800} width={'100%'}>
                            <UploadSizeManager />
                        </Stack> */}
                    </>
                )}

            </Stack>
        </Container>
    );
}
