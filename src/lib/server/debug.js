import 'server-only';

// Logs the PO creation call (POCreate.php): the request we send and the reply we
// get, so a missing PO can be traced. Printed with the prefix [checkout-debug].
// On by default; set CHECKOUT_DEBUG=false to silence it. Secrets (tokens, keys,
// cookies) are masked.
const SECRET_KEY = /token|secret|password|authorization|api[-_]?key|cookie/i;
const MAX_LINE = 6000;

export const debugOn = () => process.env.CHECKOUT_DEBUG !== 'false';

function scrub(value, depth = 0) {
    if (value == null) return value;
    if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…(+${value.length - 2000} chars)` : value;
    if (typeof value !== 'object') return value;
    if (depth > 7) return '[deep]';
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? '***' : scrub(v, depth + 1)]));
}

export function dlog(step, data) {
    if (!debugOn()) return;
    let text = '';
    if (data !== undefined) {
        try { text = JSON.stringify(scrub(data)); } catch { text = String(data); }
        if (text.length > MAX_LINE) text = `${text.slice(0, MAX_LINE)}…`;
    }
    console.log(`[checkout-debug] ${new Date().toISOString()} ${step}${text ? ` ${text}` : ''}`);
}
