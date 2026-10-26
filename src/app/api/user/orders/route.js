import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { getSessionUser, unauthorized } from '@/lib/server/session';

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        // NOTE: this PHP endpoint takes the customer code in a field named
        // `challan_no`. Confirm with the backend team that this is intended.
        const payload = await phpPost('getorder_list_invoice_item_wise.php', { challan_no: user.crm_party_code });
        if (isTrue(payload) && Array.isArray(payload?.data)) {
            return NextResponse.json({ success: true, orders: payload.data }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
        console.log('Orders fetch payload:', payload);
        return NextResponse.json({ success: false, message: payload?.message || 'No orders found.' }, { status: 404 });
    } catch (error) {
        console.error('Orders fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
