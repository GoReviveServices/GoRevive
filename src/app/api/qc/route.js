import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { cached } from '@/lib/server/cache';

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=300, s-maxage=3600' };

export async function GET(request) {
    const imei = (new URL(request.url).searchParams.get('imei') || '').trim();
    if (!/^[A-Za-z0-9-]{4,40}$/.test(imei)) {
        return NextResponse.json({ success: false, message: 'A valid IMEI / serial number is required' }, { status: 400 });
    }

    try {
        // Only successful reports are cached; "not found" is re-checked each time.
        const data = await cached(`qc:${imei}`, 60 * 60 * 1000, async () => {
            const payload = await phpPost('get_qc_details.php', { imei });
            if (isTrue(payload) && Array.isArray(payload?.data)) return payload.data;
            throw Object.assign(new Error('QC not found'), { notFound: true, upstreamMessage: payload?.message });
        });
        return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
    } catch (error) {
        if (error.notFound) {
            return NextResponse.json({ success: false, message: error.upstreamMessage || 'No QC record found.' }, { status: 404 });
        }
        console.error('QC fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
