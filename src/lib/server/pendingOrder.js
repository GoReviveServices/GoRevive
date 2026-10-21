import 'server-only';
import { cookies } from 'next/headers';
import { signToken, verifyToken, cookieOptions } from './session';

// The order being paid for is kept in a signed, httpOnly cookie between
// "create order" and "verify payment". The browser can't read or change it,
// so the amount checked after payment is the amount the server calculated.
export const PENDING_COOKIE = 'pending_order';
const TTL_SECONDS = 60 * 60; // 1 hour to finish paying

export async function setPendingOrder(response, order) {
    const token = await signToken({ typ: 'order', order }, `${TTL_SECONDS}s`);
    response.cookies.set(PENDING_COOKIE, token, cookieOptions(TTL_SECONDS));
}

export async function getPendingOrder() {
    const token = (await cookies()).get(PENDING_COOKIE)?.value;
    if (!token) {
        return null;
    }
    try {
        const payload = await verifyToken(token);
        return payload.typ === 'order' ? payload.order : null;
    } catch (error) {
        return null;
    }
}

// Guards against creating the same invoice twice on one instance (e.g. the
// status page and the Cashfree modal both finishing at once).
const completed = new Map();
const inFlight = new Map();

export function wasCompleted(orderId) {
    return completed.has(orderId);
}

export async function completeOnce(orderId, fn) {
    if (completed.has(orderId)) return completed.get(orderId);
    if (inFlight.has(orderId)) return inFlight.get(orderId);
    const p = fn()
        .then((result) => {
            completed.set(orderId, result);
            if (completed.size > 5000) completed.delete(completed.keys().next().value);
            return result;
        })
        .finally(() => inFlight.delete(orderId));
    inFlight.set(orderId, p);
    return p;
}
