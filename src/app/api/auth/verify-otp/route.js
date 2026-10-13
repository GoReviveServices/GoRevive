import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, setSessionCookie } from '@/lib/server/session';
import { OTP_COOKIE, otpMatches } from '@/lib/server/otp';
import { rateLimit, resetLimit } from '@/lib/server/rateLimit';

// Step 2 of login: check the OTP on the server and issue the session cookie.
export async function POST(request) {
    try {
        const { otp } = await request.json();
        const token = (await cookies()).get(OTP_COOKIE)?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: 'OTP expired. Please request a new one.' }, { status: 400 });
        }

        let challenge;
        try {
            challenge = await verifyToken(token);
        } catch {
            return NextResponse.json({ success: false, message: 'OTP expired. Please request a new one.' }, { status: 400 });
        }
        if (challenge.typ !== 'otp') {
            return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
        }

        // 5 wrong guesses per number per 15 minutes.
        const limitKey = `otp:verify:${challenge.mobile}`;
        const limit = rateLimit(limitKey, 5, 15 * 60 * 1000);
        if (!limit.ok) {
            return NextResponse.json({ success: false, message: 'Too many wrong attempts. Request a new OTP later.' }, { status: 429 });
        }

        if (!otpMatches(challenge.mobile, otp, challenge.otp)) {
            return NextResponse.json({ success: false, message: 'Invalid OTP. Please try again.' }, { status: 401 });
        }

        resetLimit(limitKey);
        const response = NextResponse.json({ success: true, user: challenge.user });
        response.cookies.delete(OTP_COOKIE);
        await setSessionCookie(response, challenge.user);
        return response;
    } catch (error) {
        console.error('OTP verify error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not verify OTP.' }, { status: 500 });
    }
}
