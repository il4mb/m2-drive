import { File } from "@/entity/File";
import { ViewerModule } from "../ModuleViewerManager";
import { Box } from "@mui/material";
import { ImageIcon } from "lucide-react";

const ImageViewerComponent: React.FC<{ file: File<'file'> }> = ({ file }) => {
	const fileUri = `/file/${file.id}`;
	return (
		<Box
			component={'img'}
			src={fileUri}
			sx={{
				width: '100%',
				height: '100%',
				objectFit: 'contain'
			}} />
	)
}

export default {
	id: 'image-viewer',
	name: 'Image',
	icon: <ImageIcon size={18} />,
	supports: ['image/*'],
	component: ImageViewerComponent,
	priority: 10
} as ViewerModule;