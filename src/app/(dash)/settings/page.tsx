'use client'

import { Paper, Stack, Typography } from "@mui/material";
import { Settings } from "lucide-react";
import RoleManager from "./ui/RoleManager";
import Container from "@/components/Container";

export default function page() {

    return (
        <Container scrollable>

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
                <Stack mx={'auto'} maxWidth={800} width={'100%'}>
                    <RoleManager />
                </Stack>
            </Stack>
        </Container>
    );
}
