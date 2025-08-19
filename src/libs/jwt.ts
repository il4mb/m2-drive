import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
const alg = 'HS256';

export const signJwt = async (payload: any, exp = '7d') => {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg })
        .setExpirationTime(exp)
        .sign(secret);
};

export const verifyJwt = async <T = any>(token: string): Promise<T | null> => {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as T;
    } catch (e) {
        return null;
    }
};
