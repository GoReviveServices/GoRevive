import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/server/session';
import { OTP_COOKIE } from '@/lib/server/otp';

export async function POST() {
    const response = NextResponse.json({ success: true, message: 'Logged out.' });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(OTP_COOKIE);
    return response;
}
