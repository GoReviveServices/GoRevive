import { NextResponse } from 'next/server';
import { startOtpChallenge, setOtpCookie, normalizeMobile } from '@/lib/server/otp';
import { rateLimit, clientIp } from '@/lib/server/rateLimit';

// Step 1 of login: send an OTP. The OTP is never returned to the browser.
export async function POST(request) {
    try {
        const { mobile_no } = await request.json();
        const mobile = normalizeMobile(mobile_no);

        if (mobile.length !== 10) {
            return NextResponse.json({ success: false, message: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
        }

        // Stops SMS bombing: 5 OTPs per number and 20 per IP every 15 minutes.
        const ip = await clientIp();
        const byNumber = rateLimit(`otp:mobile:${mobile}`, 5, 15 * 60 * 1000);
        const byIp = rateLimit(`otp:ip:${ip}`, 20, 15 * 60 * 1000);
        if (!byNumber.ok || !byIp.ok) {
            return NextResponse.json(
                { success: false, message: 'Too many attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(Math.max(byNumber.retryAfter, byIp.retryAfter)) } }
            );
        }

        const { next, challenge } = await startOtpChallenge(mobile);
        const response = NextResponse.json({ success: true, next });
        if (challenge) setOtpCookie(response, challenge);
        return response;
    } catch (error) {
        console.error('Login error:', error.message);
        return NextResponse.json({ success: false, message: 'Failed to contact server' }, { status: 500 });
    }
}
