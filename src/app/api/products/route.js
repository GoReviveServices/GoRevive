import { NextResponse } from 'next/server';
import { getProductBundles } from '@/lib/server/inventory';

// Inventory is cached in memory on the server (see lib/server/inventory.js)
// and at the CDN/browser for 60s, then served stale while it refreshes.
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' };

export async function GET() {
    try {
        const products = await getProductBundles();
        return NextResponse.json({ success: true, totalBundles: products.length, products }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Product aggregation error:', error.message);
        return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 502 });
    }
}
