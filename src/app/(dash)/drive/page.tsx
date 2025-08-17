"use client";

import DriveRoot from "@/components/ui/drive/DriveRoot";
import { Container, Stack } from "@mui/material";

export default function Home() {

	return (
		<Stack component={Container} flex={1} p={4}>
			<DriveRoot />
		</Stack>
	);
}
