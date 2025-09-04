// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const token = req.cookies.get('token-id')?.value;
    const { pathname } = req.nextUrl;

    // Skip check for /auth and public assets
    if (pathname.startsWith('/auth') || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // If no token, redirect to /auth
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/auth';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/:path*', // applies to all routes
};
