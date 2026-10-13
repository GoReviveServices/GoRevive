import { NextResponse } from 'next/server';
import { phpPost } from '@/lib/server/php';
import { rateLimit, clientIp } from '@/lib/server/rateLimit';

const GST_PATTERN = /^[0-9]{2}[A-Z0-9]{13}$/;

export async function POST(request) {
    try {
        const gst_no = String((await request.json()).gst_no || '').trim().toUpperCase();
        if (!GST_PATTERN.test(gst_no)) {
            return NextResponse.json({ response: { status: 'false', message: 'Invalid GST number' } }, { status: 400 });
        }

        const limit = rateLimit(`gst:ip:${await clientIp()}`, 20, 15 * 60 * 1000);
        if (!limit.ok) {
            return NextResponse.json({ response: { status: 'false', message: 'Too many lookups. Try again later.' } }, { status: 429 });
        }

        const data = await phpPost('gst_details.php', { gst_no }, { raw: true });
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('GST lookup error:', error.response?.status || error.message);
        return NextResponse.json({ response: { status: 'false', message: 'GST lookup failed' } }, { status: 500 });
    }
}
