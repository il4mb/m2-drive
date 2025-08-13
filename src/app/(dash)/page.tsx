"use client";

import { Box, Button, Container, Grid, Stack, Typography, Paper, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, Folder, Plus, Upload } from "lucide-react";

export default function Home() {
	const files = [
		{ name: "Laporan_Keuangan.xlsx", icon: <FileSpreadsheet/> },
		{ name: "Data_Karyawan.pdf", icon: <FileText /> },
		{ name: "Proposal_Proyek.docx", icon: <FileText /> },
		{ name: "Folder Proyek", icon: <Folder  /> },
	];

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			{/* Header */}
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				mb={4}
				component={motion.div}
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}>
				<Typography variant="h4" fontWeight={700}>
					Selamat Datang 😏
				</Typography>
				<Stack direction="row" spacing={2}>
					<Button
						variant="contained"
						startIcon={<Upload />}
						component={motion.button}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}>
						Upload File
					</Button>
					<Button
						variant="outlined"
						startIcon={<Plus />} 
						component={motion.button}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}>
						New Folder
					</Button>
				</Stack>
			</Stack>

			{/* File Grid */}
			<Grid container spacing={3}>
				{files.map((file, index) => (
					<Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
						<Paper
							elevation={3}
							sx={{
								p: 2,
								borderRadius: 3,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								cursor: "pointer",
								transition: "0.2s",
								"&:hover": { boxShadow: 6, transform: "translateY(-4px)" },
							}}
							component={motion.div}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.1 }}>
							<IconButton sx={{ fontSize: 50 }}>{file.icon}</IconButton>
							<Typography
								variant="body1"
								mt={1}
								noWrap
								sx={{ maxWidth: "100%", textAlign: "center" }}>
								{file.name}
							</Typography>
						</Paper>
					</Grid>
				))}
			</Grid>
		</Container>
	);
}
