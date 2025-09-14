import { File } from "@/entities/File";
import { ViewerModule } from "../ModuleViewerManager";
import {
	Box,
	Button,
	CircularProgress,
	LinearProgress,
	Stack,
	Typography,
} from "@mui/material";
import { ImageIcon, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import usePresignUrl from "@/hooks/usePresignUrl";

const ImageViewerComponent: React.FC<{ file: File<"file"> }> = ({ file }) => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const source = usePresignUrl(file.id);

	// const fileUri = `/file/${file.id}`;
	const isLargeFile = typeof file.meta?.size === "number" && file.meta.size > 4 * 1024 * 1024; // > 4MB

	const fetchImage = useCallback(() => {

		if(!source) return;
		setLoading(true);
		setError(false);
		setProgress(null);
		setImageSrc(null);

		const xhr = new XMLHttpRequest();
		xhr.open("GET", source, true);
		xhr.responseType = "blob";

		xhr.onprogress = (event) => {
			setProgress(event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : null);
		};

		xhr.onload = () => {
			if (xhr.status === 200) {
				const blobUrl = URL.createObjectURL(xhr.response);
				setImageSrc(blobUrl);
			} else {
				setError(true);
			}
			setLoading(false);
		};

		xhr.onerror = () => {
			setError(true);
			setLoading(false);
		};

		xhr.send();
		return () => xhr.abort();
	}, [source]);

	useEffect(() => {
		if(!source) return;
		const cleanup = fetchImage();
		return cleanup;
	}, [fetchImage, source]);

	return (
		<Stack
			alignItems="center"
			justifyContent="center"
			sx={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
			{/* Loading State */}
			{loading && !error && (
				<Stack
					justifyContent="center"
					alignItems="center"
					sx={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						textAlign: "center",
					}}
					spacing={1}>
					{progress !== null ? (
						<LinearProgress variant="determinate" value={progress} sx={{ width: 200 }} />
					) : (
						<CircularProgress />
					)}

					<Typography>
						{progress !== null ? `${progress}%` : "Loading..."}
					</Typography>

					{isLargeFile && progress !== null && (
						<Typography
							variant="body2"
							color="warning.main"
							sx={{ fontStyle: "italic" }}
						>
							⚠ Mohon bersabar, file besar sedang dimuat...
						</Typography>
					)}
				</Stack>
			)}

			{/* Error State */}
			{error && (
				<Stack alignItems="center" spacing={1}>
					<AlertTriangle size={32} />
					<Typography variant="body2" color="text.secondary">
						Failed to load image
					</Typography>
					<Button onClick={fetchImage} variant="outlined" size="small">
						Coba lagi
					</Button>
				</Stack>
			)}

			{/* Image Display */}
			{!error && imageSrc && (
				<Box
					component="img"
					src={imageSrc}
					alt={file.name || "Image file"}
					sx={{
						width: "100%",
						height: "100%",
						objectFit: "contain",
						opacity: loading ? 0 : 1,
						transition: "opacity 0.3s ease-in-out",
					}}
				/>
			)}
		</Stack>
	);
};

export default {
	id: "image-viewer",
	name: "Image",
	icon: <ImageIcon size={18} />,
	supports: ["image/*"],
	component: ImageViewerComponent,
	priority: 10,
} as ViewerModule;
