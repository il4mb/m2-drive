"use client";

import DriveRoot from "@/components/ui/drive/DriveRoot";
import { Container, Stack } from "@mui/material";

export default function Home() {

	return (
		<Stack
			component={Container}
			flex={1}
			p={4}
			pb={0}
			overflow={"hidden"}
			onContextMenu={(e) => e.preventDefault()}>
			<DriveRoot />
		</Stack>
	);
}
