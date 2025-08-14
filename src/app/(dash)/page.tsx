"use client";

import DriveRoot from "@/components/ui/Drive/DriveRoot";
import { Container, Stack, Typography } from "@mui/material";
import { FolderOpen } from "lucide-react";

export default function Home() {

	return (
		<Stack component={Container} flex={1} p={4}>
			<Stack direction={"row"} alignItems={"center"} spacing={1}>
				<FolderOpen size={36}/>
				<Typography fontSize={22} fontWeight={800}>
					Drive Saya
				</Typography>

			</Stack>

			<DriveRoot />

		</Stack>
	);
}
