import { cookies } from "next/headers"

interface CookieOptions {
    httpOnly?: boolean;
    path?: string;
    maxAge?: number;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
}

/**
 * Mengecek apakah cookie dengan nama tertentu ada
 */
export const cookieExist = async (name: string): Promise<boolean> => {
    const cookieJar = await cookies();
    return cookieJar.has(name);
}

/**
 * Menyetel cookie dengan opsi tambahan untuk keamanan
 */
export const setCookie = async (
    name: string,
    value: string,
    options: CookieOptions = {}
): Promise<void> => {
    const cookieJar = await cookies();
    cookieJar.set(name, value, {
        httpOnly: options.httpOnly ?? true,
        secure: options.secure ?? process.env.NODE_ENV === "production",
        sameSite: options.sameSite ?? "lax",
        path: options.path ?? "/",
        maxAge: options.maxAge ?? 60 * 60 * 24 * 7 // default 7 hari
    });
}

/**
 * Menghapus cookie dengan mengatur maxAge = 0
 */
export const deleteCookie = async (name: string): Promise<void> => {
    const cookieJar = await cookies();

    if (!cookieJar.has(name)) return;

    cookieJar.set(name, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    });
}


export const getCookie = async (name: string) => {
    const cookieJar = await cookies();
    if (!cookieJar.has(name)) return;
    return cookieJar.get(name)?.value;
}