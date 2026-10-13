import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { getSessionUser, unauthorized } from '@/lib/server/session';

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const payload = await phpPost('view_address.php', { user_id: user.crm_party_code });
        const addresses = isTrue(payload) && Array.isArray(payload?.data) ? payload.data : [];
        return NextResponse.json({ success: true, addresses }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('Address fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not load addresses.' }, { status: 500 });
    }
}
