import 'server-only';
import { headers } from 'next/headers';

// Fixed-window in-memory rate limiter. Good enough for a single instance;
// with several instances behind a load balancer, move this to Redis so the
// limits are shared.
const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) {
        buckets.set(key, { count: 1, reset: now + windowMs });
        return { ok: true, retryAfter: 0 };
    }
    bucket.count += 1;
    if (bucket.count > limit) {
        return { ok: false, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
    }
    return { ok: true, retryAfter: 0 };
}

export function resetLimit(key) {
    buckets.delete(key);
}

export async function clientIp() {
    const h = await headers();
    // X-Forwarded-For can be spoofed by the client unless your proxy overwrites it.
    // Set TRUSTED_IP_HEADER to the header your host/CDN sets itself (for example
    // x-vercel-forwarded-for or cf-connecting-ip) so per-IP limits cannot be dodged.
    const trusted = process.env.TRUSTED_IP_HEADER;
    if (trusted) {
        const value = h.get(trusted);
        if (value) return value.split(',')[0].trim();
    }
    return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

// Periodically drop expired buckets so memory does not grow forever.
if (typeof setInterval === 'function') {
    setInterval(() => {
        const now = Date.now();
        for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
    }, 60000).unref?.();
}
