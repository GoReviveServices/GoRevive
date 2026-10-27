import 'server-only';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

// Saves every step of one checkout to its own JSON file, so the whole exchange
// with the PHP backend (what we sent, what it replied) can be handed to the PHP
// developer as-is:
//
//   logs/checkout/<order_no>.json
//
// Off by default. Set CHECKOUT_LOG_FILE=true to turn it on (then restart the
// server), and CHECKOUT_LOG_DIR to write somewhere else. The files hold customer details
// (name, phone, address), so the folder is git-ignored; share them privately.
// Tokens, keys and passwords are masked. Writing a log never breaks checkout:
// any error here is reported on the console and otherwise ignored.

const SECRET_KEY = /token|secret|password|authorization|api[-_]?key|cookie/i;

export const fileLogOn = () => process.env.CHECKOUT_LOG_FILE === 'true';
const logDir = () => process.env.CHECKOUT_LOG_DIR || path.join(process.cwd(), 'logs', 'checkout');
const safeName = (orderNo) => String(orderNo).replace(/[^A-Za-z0-9_-]/g, '_');

/** Where one order's log file is (or will be) saved. */
export const checkoutLogPath = (orderNo) => path.join(logDir(), `${safeName(orderNo)}.json`);
export const checkoutLogDir = () => logDir();

function mask(value) {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(mask);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? '***' : mask(v)]));
}

// PHP sometimes prints a warning or HTML before its JSON; keep that text as-is.
const asJson = (body) => {
    if (typeof body !== 'string') return body;
    try { return JSON.parse(body); } catch { return body; }
};

// Writes to one file run one after another, so steps logged close together
// (e.g. request and reply) are never lost to two writes racing each other.
const queues = new Map();

function append(orderNo, entry) {
    const file = checkoutLogPath(orderNo);
    const previous = queues.get(file) || Promise.resolve();
    const next = previous.then(async () => {
        await mkdir(path.dirname(file), { recursive: true });
        let doc;
        try {
            doc = JSON.parse(await readFile(file, 'utf8'));
        } catch {
            doc = { order_no: String(orderNo), created_at: new Date().toISOString(), steps: [] };
        }
        doc.updated_at = new Date().toISOString();
        doc.steps.push({ n: doc.steps.length + 1, at: new Date().toISOString(), ...entry });
        // Write a temp file and rename it, so a crash never leaves half a file.
        const tmp = `${file}.${process.pid}.tmp`;
        await writeFile(tmp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
        await rename(tmp, file);
    }).catch((error) => {
        console.error('[checkout-log] could not write', file, error.message);
    });
    queues.set(file, next);
    next.finally(() => { if (queues.get(file) === next) queues.delete(file); });
    return next;
}

/** One PHP call: the endpoint, the body we sent and what came back. */
export function logPhpCall(orderNo, { endpoint, url, request, httpStatus, ms, response, error }) {
    if (!fileLogOn() || !orderNo) return Promise.resolve();
    return append(orderNo, {
        type: 'php_call',
        endpoint,
        url,
        http_status: httpStatus ?? null,
        ms,
        sent: mask(request),
        received: response === undefined ? null : mask(asJson(response)),
        ...(error ? { error } : {}),
    });
}

/** Anything else worth seeing next to the PHP calls (gateway result, a check that failed). */
export function logStep(orderNo, step, data) {
    if (!fileLogOn() || !orderNo) return Promise.resolve();
    return append(orderNo, { type: 'step', step, data: mask(data) });
}
