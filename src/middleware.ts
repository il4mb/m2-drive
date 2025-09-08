// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const token = req.cookies.get('token-id')?.value;
    const { pathname, search } = req.nextUrl;

    // Skip check for /auth and public assets
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/about') ||
        pathname.startsWith('/opener') ||
        pathname.startsWith('/file') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // If no token, redirect to /auth with ?redirect=<original_path>
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname + search); // keep query params if any
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/:path*', // applies to all routes
};
