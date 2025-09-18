// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateUUID() {
    return crypto.randomUUID();
}

const PUBLIC_ROUTES = [
    '/login',
    '/about',
    '/opener',
    '/file',
    '/api/encrypted',
    '/api/public',
    '/auth',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/health',
    '/privacy',
    '/terms'
];

const STATIC_EXTENSIONS = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.map', '.json', '.webp', '.avif'
];

export function middleware(req: NextRequest) {
    const { pathname, search, origin } = req.nextUrl;
    const token = req.cookies.get('token-id')?.value;
    const sessionCookie = req.cookies.get('session-id');

    // Skip Next.js internal/static requests
    if (
        pathname.startsWith('/_next/') ||
        pathname === '/favicon.ico' ||
        pathname.endsWith('.xml') ||
        pathname.endsWith('.txt') ||
        STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))
    ) {
        return NextResponse.next();
    }

    const isPublicRoute = PUBLIC_ROUTES.some(
        route => pathname === route || pathname.startsWith(route + '/')
    );
    const isApiRoute = pathname.startsWith('/api/');

    let response: NextResponse;
    if (sessionCookie) {
        response = NextResponse.next();
        response.cookies.set('session-id', sessionCookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365
        });
    } else {
        response = NextResponse.next();
        const sessionId = generateUUID();
        response.cookies.set('session-id', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365
        });
    }

    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    if (isPublicRoute || isApiRoute) {
        return response;
    }

    if (!token) {
        const loginUrl = new URL('/login', origin);
        if (pathname !== '/login') {
            loginUrl.searchParams.set('redirect', encodeURIComponent(pathname + search));
        }
        return NextResponse.redirect(loginUrl);
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next|favicon.ico|sitemap.xml|robots.txt).*)'],
};
