// lib/session.ts
import { signJwt, verifyJwt } from './jwt';
import { setCookie, deleteCookie, getCookie } from './cookie';

const COOKIE_NAME = 'session-token';

export type Payload = {
    type: "credential" | "vendor",
    userInfo: {
        username: string,
        email: string,
        createdAt: number
    }
}

export const setSession = async (uid: string) => {
    const token = await signJwt(uid);

    await setCookie(COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
    });

    return token;
}

export const sessionExist = async () => {
    const token = await getCookie(COOKIE_NAME);
    if (!token) return false;

    const valid = await verifyJwt(token);
    return !!valid;
}

export const getSession = async (): Promise<Payload | null> => {
    const token = await getCookie(COOKIE_NAME);
    if (!token) return null;

    return await verifyJwt(token);
}

export const clearSession = async () => {
    await deleteCookie(COOKIE_NAME);
}
