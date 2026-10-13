import 'server-only';
import axios from 'axios';
import http from 'node:http';
import https from 'node:https';

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
export async function phpPost(endpoint, body = {}, { token = process.env.PHP_STATIC_TOKEN, raw = false } = {}) {
    const res = await php.post(`/${endpoint}`, { ...body, token });
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
