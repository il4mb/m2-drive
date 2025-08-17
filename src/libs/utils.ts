import { randomBytes } from "crypto";

export function formatFileSize(bytes: number, decimals = 2): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const units = ["B", "KB", "MB", "GB", "TB", "PB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

	return `${size} ${units[i]}`;
}


export const DATE_EPOCH = 1700000000;
export const DATE_FORMAT_INTL: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
}

export const formatLocaleDate = (time: number, locale: string = 'en-US') => {
	const timestamp = (time + DATE_EPOCH) * 1000;
	return new Intl.DateTimeFormat(locale, DATE_FORMAT_INTL).format(new Date(timestamp));
}

export function currentTime(): number {
	return Math.floor(Date.now() / 1000 - DATE_EPOCH);
}

export function generateKey(length = 16) {
	return randomBytes(length).toString('hex');
}

export const camelToKebab = (obj: any) => {
	if (typeof obj !== 'object' || obj === null) return obj;
	const camelToKebab = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	return Object.fromEntries(
		Object.entries(obj)
			.map(([key, value]) => [camelToKebab(key), value])
	);
}

export const kebabToCamel = (obj: any) => {
	if (typeof obj !== 'object' || obj === null) return obj;
	const kebabToCamel = (str: string) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
	return Object.fromEntries(
		Object.entries(obj)
			.map(([key, value]) => [kebabToCamel(key), value])
	);
}