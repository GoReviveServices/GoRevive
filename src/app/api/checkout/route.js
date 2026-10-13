import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/server/session';
import { createOrder, completeOrder, OrderError } from '@/lib/server/orders';
import { setPendingOrder, completeOnce } from '@/lib/server/pendingOrder';
import { createHdfcSession, createCashfreeOrder } from '@/lib/paymentHelpers';
import { rateLimit } from '@/lib/server/rateLimit';

const GATEWAYS = ['CASHFREE', 'HDFC'];
const CASHFREE_METHODS = new Set(['cc', 'dc', 'ccc', 'ppc', 'nb', 'upi', 'paypal', 'app', 'paylater', 'cardlessemi', 'dcemi', 'ccemi', 'banktransfer']);
const HDFC_METHODS = new Set(['CARD', 'NB', 'UPI', 'WALLET']);

/**
 * One server-side checkout step: prices the cart, creates the PO, and either
 * finishes a wallet-paid order or opens a payment session for the remainder.
 * The browser only chooses the address and payment method — never amounts.
 */
export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const limit = rateLimit(`checkout:${user.crm_party_code}`, 10, 10 * 60 * 1000);
    if (!limit.ok) {
        return NextResponse.json({ success: false, message: 'Too many checkout attempts. Please wait a few minutes.' }, { status: 429 });
    }

    try {
        const { addressId, gateway: rawGateway = 'CASHFREE', option = '' } = await request.json();
        const gateway = String(rawGateway).toUpperCase();
        if (!GATEWAYS.includes(gateway)) {
            return NextResponse.json({ success: false, message: 'Unsupported payment method.' }, { status: 400 });
        }

        const order = await createOrder(user, { addressId, gateway });

        // Wallet covers everything: no gateway, finish now.
        if (order.payable === 0) {
            await completeOnce(order.orderId, () => completeOrder(user, order, `WALLET-${order.orderId}`));
            return NextResponse.json({ success: true, completed: true, orderId: order.orderId, gateway: 'WALLET' });
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const returnUrl = `${baseUrl}/checkout/status?order_id=${encodeURIComponent(order.orderId)}`;
        let payment;

        if (gateway === 'CASHFREE') {
            const methods = String(option || '').split(',').map((m) => m.trim()).filter((m) => CASHFREE_METHODS.has(m));
            payment = await createCashfreeOrder({
                orderId: order.orderId,
                amount: order.payable,
                customerId: user.crm_party_code,
                phone: user.mobile,
                email: user.email,
                name: user.cust_name,
                returnUrl,
                payment_methods_filters: methods.length ? methods.join(',') : undefined,
            });
        } else {
            const method = String(option || '').toUpperCase();
            payment = await createHdfcSession({
                orderId: order.orderId,
                amount: order.payable,
                customerId: user.crm_party_code,
                phone: user.mobile,
                email: user.email,
                returnUrl,
                payment_filter: HDFC_METHODS.has(method)
                    ? { allowDefaultOptions: false, options: [{ paymentMethodType: method, enable: true }] }
                    : undefined,
            });
        }

        const response = NextResponse.json({
            success: true,
            completed: false,
            orderId: order.orderId,
            gateway,
            paymentUrl: payment.paymentUrl,
            sessionId: payment.sessionId,
        });
        await setPendingOrder(response, order);
        return response;
    } catch (error) {
        if (error instanceof OrderError) {
            return NextResponse.json({ success: false, message: error.message, ...error.extra }, { status: 400 });
        }
        console.error('Checkout error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not start payment. Please try again.' }, { status: 502 });
    }
}
