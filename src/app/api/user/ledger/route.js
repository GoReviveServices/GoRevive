import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/server/session';
import { getWalletBalance } from '@/lib/server/orders';

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const balance = await getWalletBalance(user.crm_party_code);
        return NextResponse.json({ success: true, balance }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('Ledger fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Failed to fetch ledger' }, { status: 500 });
    }
}
