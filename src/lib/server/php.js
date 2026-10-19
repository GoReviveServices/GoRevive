import 'server-only';
import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import { dlog } from './debug';

// One shared client for every call to the PHP backend.
// keepAlive agents reuse TCP/TLS connections instead of opening a new one per
// request (connection pooling on the Next.js side), and the timeout stops a
// slow PHP endpoint from hanging a Next.js request forever.
const php = axios.create({
    baseURL: process.env.PHP_API_BASE_URL,
    timeout: Number(process.env.PHP_TIMEOUT_MS || 15000),
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
});

/**
 * POST to a PHP endpoint with the static token injected.
 * Returns the unwrapped payload (`data.response` when present, else `data`).
 */
// The PO and the invoice are the calls that matter: their full request and
// reply are traced. Other calls get a one-line summary.
const TRACE_FULL = new Set(['POCreate.php', 'invoice_creation.php']);

export async function phpPost(endpoint, body = {}, { token = process.env.PHP_STATIC_TOKEN, raw = false } = {}) {
    const started = Date.now();
    if (TRACE_FULL.has(endpoint)) dlog(`PHP -> ${endpoint} request`, { url: `${process.env.PHP_API_BASE_URL}/${endpoint}`, body });
    let res;
    try {
        res = await php.post(`/${endpoint}`, { ...body, token });
    } catch (error) {
        dlog(`PHP !! ${endpoint} request failed`, { message: error.message, code: error.code, httpStatus: error.response?.status, replyBody: error.response?.data, ms: Date.now() - started });
        throw error;
    }
    const ms = Date.now() - started;
    if (TRACE_FULL.has(endpoint)) {
        dlog(`PHP <- ${endpoint} reply`, { httpStatus: res.status, ms, contentType: res.headers?.['content-type'], bodyType: typeof res.data, body: res.data });
    } else {
        dlog(`PHP <- ${endpoint}`, { httpStatus: res.status, ms, status: res.data?.status ?? res.data?.response?.status });
    }
    if (raw) return res.data;
    return res.data?.response ?? res.data;
}

/** POST multipart form data (FormData must already contain the token). */
export async function phpPostForm(endpoint, formData) {
    const res = await php.post(`/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.response ?? res.data;
}

export const isTrue = (payload) => String(payload?.status).toLowerCase() === 'true';
