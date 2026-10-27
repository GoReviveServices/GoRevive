import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Pages that need a signed-in user.
const PROTECTED = ['/dashboard', '/order', '/checkout', '/cart'];

// Host redirect is opt-in so preview/staging domains keep working.
const canonicalHost = () => {
    if (process.env.ENFORCE_CANONICAL_HOST !== 'true') return null;
    try {
        return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
    } catch {
        return null;
    }
};

async function hasValidSession(request) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token || !process.env.JWT_SECRET) return false;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        return payload.typ === 'session' && Boolean(payload.crm_party_code);
    } catch {
        return false;
    }
}

export async function proxy(request) {
    const url = request.nextUrl;

    // 1. Enforce HTTPS and one canonical host (e.g. www.gorevive.in).
    // Opt-in with ENFORCE_HTTPS=true: it relies on the load balancer / reverse
    // proxy sending X-Forwarded-Proto: https. If it doesn't, every request would
    // redirect forever, so only switch this on once that header is confirmed.
    if (process.env.ENFORCE_HTTPS === 'true') {
        const proto = request.headers.get('x-forwarded-proto');
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const wantedHost = canonicalHost();
        const wrongProto = proto && proto !== 'https';
        const wrongHost = wantedHost && host && host !== wantedHost && !host.startsWith('localhost');
        if (wrongProto || wrongHost) {
            const target = new URL(url.pathname + url.search, `https://${wrongHost ? wantedHost : host}`);
            return NextResponse.redirect(target, 308);
        }
    }

    // 2. Signed-out users can't open account pages.
    if (PROTECTED.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
        if (!(await hasValidSession(request))) {
            const login = new URL('/login', request.url);
            login.searchParams.set('next', url.pathname);
            return NextResponse.redirect(login);
        }
    }

    return NextResponse.next();
}

export const config = {
    // Skip static files, images and Next internals.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff2?)$).*)'],
};
