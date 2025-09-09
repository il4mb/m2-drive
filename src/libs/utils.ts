import { randomBytes } from "crypto";

export function formatFileSize(bytes: number, decimals = 2): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const units = ["B", "KB", "MB", "GB", "TB", "PB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

	return `${size} ${units[i]}`;
}

export type TypeUnit = {
	value: number;
	unit: string | null;
};

export const parseUnit = (value: string): TypeUnit => {
	const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/i);
	return {
		value: parseFloat(match?.[1] || '0'),
		unit: match?.[2]?.toUpperCase() || null
	};
};

export const getFileSizeFromUnit = (value: string | TypeUnit): number => {
	const { value: num, unit } = typeof value == "string" ? parseUnit(value) : value;
	if (!unit) return num;

	const units: Record<string, number> = {
		B: 1,
		KB: 1024,
		MB: 1024 ** 2,
		GB: 1024 ** 3,
		TB: 1024 ** 4,
		PB: 1024 ** 5
	};

	return num * (units[unit] || 1);
};



export const DATE_EPOCH = 1700000000;
export const DATE_FORMAT_INTL: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
}


export const epochTime = (time: number) => (time + DATE_EPOCH) * 1000;
export const formatLocaleDate = (time: number, locale: string = 'en-US') => {
	const timestamp = (time + DATE_EPOCH) * 1000;
	return new Intl.DateTimeFormat(locale, DATE_FORMAT_INTL).format(new Date(timestamp));
}

export const toRelativeTime = (time: number) => {

	const now = Math.floor(Date.now() / 1000);
	const timestamp = time + DATE_EPOCH;
	let diff = now - timestamp;

	const units = [
		{ name: "tahun", seconds: 31536000 },
		{ name: "bulan", seconds: 2592000 },
		{ name: "minggu", seconds: 604800 },
		{ name: "hari", seconds: 86400 },
		{ name: "jam", seconds: 3600 },
		{ name: "menit", seconds: 60 },
		{ name: "detik", seconds: 1 },
	];

	// Detect future
	const isFuture = diff < 0;
	diff = Math.abs(diff);

	for (const unit of units) {
		if (diff >= unit.seconds) {
			const value = Math.floor(diff / unit.seconds);
			const label = `${value} ${unit.name}`;
			return isFuture ? `dalam ${label}` : `${label} lalu`;
		}
	}

	return "baru saja";
}

export function toTimeLeft(start: number, time: number): string {

	const from = start + DATE_EPOCH;
	const timestamp = time + DATE_EPOCH;
	let diff = from - timestamp;

	const units = [
		{ name: "tahun", seconds: 31536000 },
		{ name: "bulan", seconds: 2592000 },
		{ name: "minggu", seconds: 604800 },
		{ name: "hari", seconds: 86400 },
		{ name: "jam", seconds: 3600 },
		{ name: "menit", seconds: 60 },
		{ name: "detik", seconds: 1 },
	];

	// Detect future
	const isFuture = diff < 0;
	diff = Math.abs(diff);

	for (const unit of units) {
		if (diff >= unit.seconds) {
			const value = Math.floor(diff / unit.seconds);
			const label = `${value} ${unit.name}`;
			return isFuture ? `dalam ${label}` : `${label} lagi`;
		}
	}

	return "sekarang";
}
export function currentTime(mod?: string): number {
	let time = Math.floor(Date.now() / 1000 - DATE_EPOCH);

	if (mod) {
		// Match formats like "+1h", "-1.5d", "+30m", "120s"
		const match = /^([+-]?)(\d+(\.\d+)?)([smhd])$/i.exec(mod.trim());
		if (!match) {
			throw new Error(`Invalid mod format: ${mod}. Use formats like "+1h", "-30m", "+2.5d".`);
		}

		const sign = match[1] === "-" ? -1 : 1;
		const value = parseFloat(match[2]);
		const unit = match[4].toLowerCase();

		let seconds = 0;
		switch (unit) {
			case "s": seconds = value; break;
			case "m": seconds = value * 60; break;
			case "h": seconds = value * 3600; break;
			case "d": seconds = value * 86400; break;
		}

		time += sign * Math.round(seconds);
	}

	return time;
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