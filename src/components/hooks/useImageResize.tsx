export default function useImageResize(width: number, height: number) {

    const dataURLtoFile = (dataUrl: string, filename: string): File => {
        const [meta, content] = dataUrl.split(",");
        const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(content);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
        return new File([u8arr], filename, { type: mime });
    };

    const resize = async (file: File) => {
        const img = new Image();
        const reader = new FileReader();

        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            reader.onload = (e) => {
                if (e.target?.result) img.src = e.target.result as string;
            };
            reader.readAsDataURL(file);
        });

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const scale = Math.max(width / img.width, height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (width - scaledWidth) / 2;
        const offsetY = (height - scaledHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        return dataURLtoFile(resizedDataUrl, file.name);
    }
    
    return resize;
}