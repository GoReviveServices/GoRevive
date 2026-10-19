import { NextResponse } from 'next/server';
import { getProductBundles } from '@/lib/server/inventory';
import { getPriceTier } from '@/lib/server/session';

// Customer prices are public and cacheable. Retailer prices are per-user and
// must never be stored by a shared cache.
const cacheHeaders = (tier) =>
    tier === 'retailer'
        ? { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
        : { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300', Vary: 'Cookie' };

export async function GET() {
    try {
        const tier = await getPriceTier();
        const products = await getProductBundles(tier);
        return NextResponse.json({ success: true, totalBundles: products.length, products }, { headers: cacheHeaders(tier) });
    } catch (error) {
        console.error('Product aggregation error:', error.message);
        return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 502 });
    }
}
