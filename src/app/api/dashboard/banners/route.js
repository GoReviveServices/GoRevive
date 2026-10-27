import { NextResponse } from 'next/server';
import { getBanners } from '@/lib/server/banners';

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' };

export async function GET() {
    try {
        const banners = await getBanners();
        return NextResponse.json({ banners }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Banner fetch error:', error.message);
        return NextResponse.json({ banners: [] }, { status: 200 });
    }
}
