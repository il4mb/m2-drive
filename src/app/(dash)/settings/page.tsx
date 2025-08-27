'use client'

import { Stack, Typography } from "@mui/material";
import { Ruler, Settings } from "lucide-react";
import RoleManager from "./ui/RoleManager";

export default function page() {

    return (
        <Stack m={2}>
            <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"space-between"} mb={1}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Settings size={28} />
                    <Typography fontSize={22} fontWeight={600}>
                        Pengaturan
                    </Typography>
                </Stack>
            </Stack>

            <Stack mx={'auto'} maxWidth={800} width={'100%'}>
                <RoleManager />
            </Stack>
        </Stack>
    );
}
