import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { getSessionUser, unauthorized } from '@/lib/server/session';

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const payload = await phpPost('getKycStatus.php', { userid: user.crm_party_code });
        if (isTrue(payload) && Array.isArray(payload?.data)) {
            return NextResponse.json({ success: true, kycData: payload.data[0] }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
        return NextResponse.json({ success: false, message: 'Failed to fetch KYC status' }, { status: 400 });
    } catch (error) {
        console.error('KYC fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
