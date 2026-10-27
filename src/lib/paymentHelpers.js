import 'server-only';
import axios from 'axios';

const gatewayHttp = axios.create({ timeout: 20000 });

// Env values with stray spaces or a trailing "\r" (Windows line endings) make
// the gateway reject the keys, so every gateway setting is read through this.
const env = (name) => String(process.env[name] ?? '').trim();
const cashfreeBaseUrl = () => env('CASHFREE_BASE_URL').replace(/\/+$/, '');

// "production" when the server talks to api.cashfree.com, otherwise "sandbox".
// A session created in one environment is invalid in the other.
export function getCashfreeMode() {
    return /\/\/api\.cashfree\.com/i.test(cashfreeBaseUrl()) ? 'production' : 'sandbox';
}

// Checked before every Cashfree call. Missing settings stop the request with a
// clear message; mismatched ones (sandbox keys on the live URL, or the reverse)
// are only warned about, because Cashfree rejects those itself.
function assertCashfreeConfig() {
    const base = cashfreeBaseUrl();
    const appId = env('CASHFREE_APP_ID');
    const secret = env('CASHFREE_SECRET_KEY');

    const missing = [
        !base && 'CASHFREE_BASE_URL',
        !appId && 'CASHFREE_APP_ID',
        !secret && 'CASHFREE_SECRET_KEY',
    ].filter(Boolean);
    if (missing.length) {
        throw new Error(`Cashfree is not configured: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} empty or missing. Check .env.local, and make sure none of them is repeated lower down in the file as a blank line.`);
    }

    const mode = getCashfreeMode();
    const keyEnv = (secret.match(/^cfsk_ma_(test|prod)_/) || [])[1];
    if (keyEnv && (keyEnv === 'prod') !== (mode === 'production')) {
        console.warn(`Cashfree config mismatch: CASHFREE_SECRET_KEY is a ${keyEnv} key but CASHFREE_BASE_URL points at ${mode}.`);
    }
    if (/^TEST/i.test(appId) !== (mode === 'sandbox')) {
        console.warn(`Cashfree config mismatch: CASHFREE_APP_ID ${/^TEST/i.test(appId) ? 'looks like a sandbox id' : 'does not look like a sandbox id'} but CASHFREE_BASE_URL points at ${mode}.`);
    }
    if (!/^https:\/\/(sandbox|api)\.cashfree\.com\/pg$/i.test(base)) {
        console.warn(`Unexpected CASHFREE_BASE_URL "${base}"; expected https://sandbox.cashfree.com/pg or https://api.cashfree.com/pg.`);
    }
}

// NOTE: the payment_session_id must reach the browser EXACTLY as Cashfree returned
// it. Cashfree's troubleshooting guide lists a trimmed or altered session id as a
// cause of "payment_session_id is not present or is invalid", and its real ids can
// end in "...paymentpayment". An earlier version of this file stripped that
// suffix, which made every pop-up fail with that error. Do not edit the id.

/**
 * ==========================================
 * HDFC SMARTGATEWAY FUNCTIONS
 * ==========================================
 */

/**
 * @param {Object} params - { orderId, amount, customerId, phone, email, returnUrl }
 * @returns {Object} { paymentUrl, sdkPayload }
 */

// Throws a clear message when an HDFC setting is empty (for example a blank
// duplicate line lower down in the env file), instead of sending "Basic undefined:".
function assertHdfcConfig() {
    const missing = ['HDFC_BASE_URL', 'HDFC_API_KEY', 'HDFC_MERCHANT_ID', 'NEXT_PUBLIC_HDFC_CLIENT_ID'].filter((name) => !env(name));
    if (missing.length) {
        throw new Error(`HDFC is not configured: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} empty or missing. Check .env.local for a blank duplicate line.`);
    }
}

const hdfcBaseUrl = () => env('HDFC_BASE_URL').replace(/\/+$/, '');
const hdfcAuthHeader = () => `Basic ${Buffer.from(`${env('HDFC_API_KEY')}:`).toString('base64')}`;

export async function createHdfcSession({ orderId, amount, customerId, phone, email, returnUrl, payment_filter }) {
    try {
        assertHdfcConfig();
        const authHeader = hdfcAuthHeader();

        const payload = {
            order_id: orderId,
            amount: Number(amount).toFixed(2),
            customer_id: customerId,
            customer_email: email,
            customer_phone: phone,
            payment_page_client_id: env('NEXT_PUBLIC_HDFC_CLIENT_ID'),
            action: "paymentPage",
            return_url: returnUrl,
            payment_filter,
        };


        const response = await gatewayHttp.post(`${hdfcBaseUrl()}/session`, payload, {
            headers: {
                'Authorization': authHeader,
                'x-merchantid': env('HDFC_MERCHANT_ID'),
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;


        if (data.status !== "NEW") {
            throw new Error(data.message || "Failed to create HDFC session");
        }

        return {
            paymentUrl: data.payment_links?.web,
            sdkPayload: data.sdk_payload
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message || "HDFC Session Initiation Failed");
    }
}

/**
 * @param {String} orderId 
 * @returns {Object} { isPaid, status, amount, customerId, reference }
 */
export async function verifyHdfcOrder(orderId) {
    try {
        assertHdfcConfig();
        const response = await gatewayHttp.get(`${hdfcBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
            headers: {
                'Authorization': hdfcAuthHeader(),
                'x-merchantid': env('HDFC_MERCHANT_ID'),
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        return {
            isPaid: data.status === "CHARGED",
            status: data.status,
            amount: Number(data.amount),
            customerId: data.customer_id,
            reference: data.txn_id || data.id || orderId,
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to verify HDFC order status");
    }
}

/**
 * ==========================================
 * IDFC / CASHFREE FUNCTIONS
 * ==========================================
 */

/**
 * @param {Object} params - { orderId, amount, customerId, phone, email, name, returnUrl }
 * @returns {Object} { paymentUrl, sessionId }
 */

export async function createCashfreeOrder({ orderId, amount, customerId, phone, email, name, returnUrl, payment_methods_filters }) {
    try {
        assertCashfreeConfig();
        const payload = {
            order_id: orderId,
            order_amount: Number(Number(amount).toFixed(2)),
            order_currency: "INR",
            customer_details: {
                customer_id: customerId,
                customer_phone: phone,
                customer_email: email,
                customer_name: name || "website Customer"
            },
            order_meta: {
                // Cashfree's gateway answers 403 to an http://localhost return_url, so it is
                // only sent when it is https. The payment pop-up does not need it: the site
                // goes to the status page itself when the pop-up finishes.
                ...(String(returnUrl || '').startsWith('https://') ? { return_url: returnUrl } : {}),
                payment_methods: typeof payment_methods_filters === 'string' 
                    ? payment_methods_filters 
                    : payment_methods_filters?.methods?.values || undefined
            },
        };

        const response = await gatewayHttp.post(`${cashfreeBaseUrl()}/orders`, payload, {
            headers: {
                'x-client-id': env('CASHFREE_APP_ID'),
                'x-client-secret': env('CASHFREE_SECRET_KEY'),
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        // Passed on untouched: see the note above about not modifying the session id.
        const sessionId = data.payment_session_id;

        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error(data?.message || 'Cashfree did not return a payment session');
        }

        return {
            sessionId,
            // Same environment the order was just created in, so the browser SDK
            // can never target a different one than the server.
            mode: getCashfreeMode(),
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message || "Failed to create Cashfree order");
    }
}



/**
 * @param {String} orderId 
 * @returns {Object} 
 */
export async function verifyCashfreeOrder(orderId) {
    try {
        assertCashfreeConfig();
        const response = await gatewayHttp.get(`${cashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
            headers: {
                'x-client-id': env('CASHFREE_APP_ID'),
                'x-client-secret': env('CASHFREE_SECRET_KEY'),
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        return {
            isPaid: data.order_status === "PAID",
            status: data.order_status,
            amount: Number(data.order_amount),
            customerId: data.customer_details?.customer_id,
            reference: data.cf_order_id || orderId,
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to verify Cashfree order status");
    }
}