import { NextResponse } from 'next/server';
import { verifyHdfcOrder, verifyCashfreeOrder } from '@/lib/paymentHelpers';
import { getSessionUser, unauthorized } from '@/lib/server/session';
import { getPendingOrder, completeOnce, wasCompleted, PENDING_COOKIE } from '@/lib/server/pendingOrder';
import { completeOrder, OrderError } from '@/lib/server/orders';

const verifyWithGateway = (gateway, orderId) =>
    gateway === 'HDFC' ? verifyHdfcOrder(orderId) : verifyCashfreeOrder(orderId);

/**
 * Called by the payment status page. The amount, customer and gateway are
 * checked against the order the server created — not against anything the
 * browser sends — and the invoice is created at most once.
 */
export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const { orderId } = await request.json();
        if (!orderId || !String(orderId).startsWith(`GR_${user.crm_party_code}_`)) {
            return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
        }

        if (wasCompleted(orderId)) {
            return NextResponse.json({ success: true, isPaid: true, status: 'COMPLETED' });
        }

        const order = await getPendingOrder();

        // No pending order (e.g. the page was refreshed after completion):
        // report the gateway's status but never create another invoice here.
        if (!order || order.orderId !== orderId) {
            // Money may have been taken but there is nothing to build an invoice from.
            console.error('Verify: no matching pending order, no invoice will be created', { orderId, hasPendingCookie: Boolean(order), cookieOrderId: order?.orderId });
            for (const gateway of ['CASHFREE', 'HDFC']) {
                try {
                    const result = await verifyWithGateway(gateway, orderId);
                    return NextResponse.json({ success: true, isPaid: result.isPaid, status: result.status });
                } catch {
                    /* try the next gateway */
                }
            }
            return NextResponse.json({ success: false, message: 'Order not found. Check your order history.' }, { status: 404 });
        }

        const result = await verifyWithGateway(order.gateway, orderId);
        if (!result.isPaid) {
            return NextResponse.json({ success: true, isPaid: false, status: result.status, message: 'Payment was not completed.' });
        }

        const amountOk = Math.abs(Number(result.amount) - Number(order.payable)) < 0.01;
        const customerOk = !result.customerId || String(result.customerId) === String(user.crm_party_code);
        if (!amountOk || !customerOk) {
            console.error('Payment mismatch', { orderId, expected: order.payable, paid: result.amount, customer: result.customerId });
            return NextResponse.json(
                { success: false, isPaid: false, message: 'Payment details did not match this order. Our team will review it and contact you.' },
                { status: 409 }
            );
        }

        await completeOnce(orderId, () => completeOrder(user, order, result.reference));

        const response = NextResponse.json({ success: true, isPaid: true, status: result.status });
        response.cookies.delete(PENDING_COOKIE);
        return response;
    } catch (error) {
        if (error instanceof OrderError) {
            return NextResponse.json({ success: false, isPaid: true, message: error.message }, { status: 409 });
        }
        console.error('Payment verification error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not verify payment. Please check your order history.' }, { status: 502 });
    }
}
