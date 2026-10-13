import { NextResponse } from 'next/server';
import { getUnitsForModel } from '@/lib/server/inventory';

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' };

async function handle(modelCode) {
    if (!modelCode) {
        return NextResponse.json({ success: false, error: 'modelCode is required' }, { status: 400 });
    }
    try {
        const units = await getUnitsForModel(modelCode);
        return NextResponse.json({ success: true, totalFound: units.length, units }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Product details error:', error.message);
        return NextResponse.json({ success: false, error: 'Failed to fetch units' }, { status: 502 });
    }
}

// GET is cacheable by the browser and CDN: /api/products/details?model=...
export async function GET(request) {
    return handle(new URL(request.url).searchParams.get('model'));
}

// Kept for backward compatibility with older clients.
export async function POST(request) {
    const { modelCode } = await request.json().catch(() => ({}));
    return handle(modelCode);
}
