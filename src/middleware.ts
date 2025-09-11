// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper: Generate UUID without Node's crypto
function generateUUID() {
    return crypto.randomUUID(); // Web Crypto API
}

export function middleware(req: NextRequest) {
    const token = req.cookies.get('token-id')?.value;
    const { pathname, search } = req.nextUrl;
    const sessionCookie = req.cookies.get('session-id');

    // Create session ID if it doesn't exist
    if (!sessionCookie) {
        const response = NextResponse.next();
        const sessionId = generateUUID();
        response.cookies.set('session-id', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 365 // 1 year
        });
        return response;
    }

    // Skip authentication check for public routes
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/about') ||
        pathname.startsWith('/opener') ||
        pathname.startsWith('/file') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/encrypted') ||
        pathname.startsWith('/api/public') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // If no token, redirect to /login
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/:path*',
};
