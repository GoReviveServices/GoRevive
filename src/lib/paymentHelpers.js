import 'server-only';
import axios from 'axios';
import { dlog } from '@/lib/server/debug';

const gatewayHttp = axios.create({ timeout: 20000 });

// What the app is configured to talk to (no secrets): enough to spot test keys
// on the production URL, an http return URL, or a missing variable.
function cashfreeEnv() {
    const secret = String(process.env.CASHFREE_SECRET_KEY || '');
    return {
        baseUrl: process.env.CASHFREE_BASE_URL,
        appIdPrefix: String(process.env.CASHFREE_APP_ID || '').slice(0, 4),
        hasAppId: Boolean(process.env.CASHFREE_APP_ID),
        keyEnvironment: (secret.match(/^cfsk_ma_(test|prod)/) || [])[1] || (secret ? 'unrecognised' : 'MISSING'),
        browserMode: process.env.NEXT_PUBLIC_CASHFREE_MODE || '(unset = sandbox)',
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    };
}

// Cashfree session ids end in "payment" exactly once. The API sometimes returns
// "...paymentpayment", and the checkout pop-up then shows "Something went wrong".
export function cleanCashfreeSessionId(id) {
    return typeof id === 'string' ? id.replace(/(?:payment){2,}$/, 'payment') : id;
}

function describeGatewayError(error) {
    return {
        message: error.message,
        code: error.code,
        httpStatus: error.response?.status,
        contentType: error.response?.headers?.['content-type'],
        replyBody: error.response?.data,
        replyHeaders: error.response?.headers ? { server: error.response.headers.server, 'cf-ray': error.response.headers['cf-ray'], 'x-request-id': error.response.headers['x-request-id'] } : undefined,
    };
}

/**
 * ==========================================
 * HDFC SMARTGATEWAY FUNCTIONS
 * ==========================================
 */

/**
 * @param {Object} params - { orderId, amount, customerId, phone, email, returnUrl }
 * @returns {Object} { paymentUrl, sdkPayload }
 */

export async function createHdfcSession({ orderId, amount, customerId, phone, email, returnUrl, payment_filter }) {
    try {
        const authHeader = `Basic ${Buffer.from(process.env.HDFC_API_KEY + ":").toString('base64')}`;

        const payload = {
            order_id: orderId,
            amount: Number(amount).toFixed(2),
            customer_id: customerId,
            customer_email: email,
            customer_phone: phone,
            payment_page_client_id: process.env.NEXT_PUBLIC_HDFC_CLIENT_ID,
            action: "paymentPage",
            return_url: returnUrl,
            payment_filter,
        };


        const response = await gatewayHttp.post(`${process.env.HDFC_BASE_URL}/session`, payload, {
            headers: {
                'Authorization': authHeader,
                'x-merchantid': process.env.HDFC_MERCHANT_ID,
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
        const authHeader = `Basic ${Buffer.from(process.env.HDFC_API_KEY + ":").toString('base64')}`;

        const response = await gatewayHttp.get(`${process.env.HDFC_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': authHeader,
                'x-merchantid': process.env.HDFC_MERCHANT_ID,
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
        if (!payload.order_meta.return_url) dlog('Cashfree: return_url left out because it is not https', { returnUrl });

        dlog('Cashfree -> create order', { env: cashfreeEnv(), orderId, amount: payload.order_amount, returnUrl, paymentMethods: payload.order_meta.payment_methods, customerId });
        const response = await gatewayHttp.post(`${process.env.CASHFREE_BASE_URL}/orders`, payload, {
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        const rawSessionId = data.payment_session_id;
        const sessionId = cleanCashfreeSessionId(rawSessionId);
        dlog('Cashfree <- create order', {
            httpStatus: response.status,
            cfOrderId: data.cf_order_id,
            orderStatus: data.order_status,
            hasSessionId: Boolean(rawSessionId),
            sessionIdTail: String(rawSessionId || '').slice(-24),
            sessionIdWasTrimmed: sessionId !== rawSessionId,
        });

        return {
            sessionId
        };
    } catch (error) {
        dlog('Cashfree !! create order FAILED', { ...describeGatewayError(error), env: cashfreeEnv() });
        throw new Error(error.response?.data?.message || error.message || "Failed to create Cashfree order");
    }
}



/**
 * @param {String} orderId 
 * @returns {Object} 
 */
export async function verifyCashfreeOrder(orderId) {
    try {
        const response = await gatewayHttp.get(`${process.env.CASHFREE_BASE_URL}/orders/${orderId}`, {
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY,
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
        dlog('Cashfree !! verify order FAILED', { orderId, ...describeGatewayError(error), env: cashfreeEnv() });
        throw new Error(error.response?.data?.message || "Failed to verify Cashfree order status");
    }
}