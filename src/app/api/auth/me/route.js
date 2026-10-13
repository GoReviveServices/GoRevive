import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';

export async function GET() {
    const user = await getSessionUser();
    // Guests get 200 + null (not 401) so normal page loads don't log errors.
    if (!user) return NextResponse.json({ user: null }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
    const { iat, exp, typ, ...safe } = user;
    return NextResponse.json({ user: safe }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
}
