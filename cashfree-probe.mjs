// Finds which part of the website's Cashfree request gets a 403.
// Run from the project folder:  node --env-file=.env cashfree-probe.mjs
// Creates a few Rs 10-13,896 test orders in the Cashfree SANDBOX only. Prints no secrets.
import axios from 'axios';

const base = process.env.CASHFREE_BASE_URL;
if (!base || !/sandbox/.test(base) && !process.env.PROBE_ALLOW_ANY) {
    console.log('CASHFREE_BASE_URL is not the sandbox URL; stopping so no live order is created:', base);
    process.exit(1);
}
const headers = {
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json',
};
const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const id = (t) => `PROBE_${t}_${Date.now()}`;

const body = (tag, extra = {}, cust = {}) => {
    const order_id = id(tag);
    return {
        order_id,
        order_amount: extra.amount ?? 10,
        order_currency: 'INR',
        customer_details: { customer_id: 'ZBB0178', customer_phone: '8700406878', ...cust },
        ...(extra.meta ? { order_meta: extra.meta(order_id) } : {}),
    };
};

const tests = [
    ['A axios, minimal body', 'axios', body('A')],
    ['B axios, + customer email & name', 'axios', body('B', {}, { customer_email: 'testharsh@gmail.com', customer_name: 'TESTING HARSH' })],
    ['C axios, + return_url', 'axios', body('C', { meta: (o) => ({ return_url: `${site}/checkout/status?order_id=${o}` }) }, { customer_email: 'testharsh@gmail.com', customer_name: 'TESTING HARSH' })],
    ['D axios, + payment_methods cc,dc (same as the website)', 'axios', body('D', { amount: 13896, meta: (o) => ({ return_url: `${site}/checkout/status?order_id=${o}`, payment_methods: 'cc,dc' }) }, { customer_email: 'testharsh@gmail.com', customer_name: 'TESTING HARSH' })],
    ['E fetch, same body as D', 'fetch', body('E', { amount: 13896, meta: (o) => ({ return_url: `${site}/checkout/status?order_id=${o}`, payment_methods: 'cc,dc' }) }, { customer_email: 'testharsh@gmail.com', customer_name: 'TESTING HARSH' })],
    ['F axios, same as D but https return_url', 'axios', body('F', { amount: 13896, meta: (o) => ({ return_url: `https://example.com/checkout/status?order_id=${o}`, payment_methods: 'cc,dc' }) }, { customer_email: 'testharsh@gmail.com', customer_name: 'TESTING HARSH' })],
];

for (const [name, client, payload] of tests) {
    let status, server, snippet;
    try {
        if (client === 'axios') {
            const r = await axios.post(`${base}/orders`, payload, { headers, timeout: 20000, validateStatus: () => true });
            status = r.status; server = r.headers.server;
            snippet = typeof r.data === 'string' ? r.data.replace(/\s+/g, ' ').slice(0, 90) : r.data?.payment_session_id ? 'session created' : JSON.stringify(r.data).slice(0, 140);
        } else {
            const r = await fetch(`${base}/orders`, { method: 'POST', headers, body: JSON.stringify(payload) });
            status = r.status; server = r.headers.get('server');
            const t = await r.text();
            snippet = t.includes('payment_session_id') ? 'session created' : t.replace(/\s+/g, ' ').slice(0, 140);
        }
    } catch (e) { status = 'ERR'; snippet = e.message; }
    console.log(`${String(status).padEnd(4)} ${String(server ?? '-').padEnd(10)} ${name}  ->  ${snippet}`);
}
