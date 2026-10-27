import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { startOtpChallenge, setOtpCookie, normalizeMobile } from '@/lib/server/otp';
import { rateLimit, clientIp } from '@/lib/server/rateLimit';

// Only these fields are forwarded to PHP; anything else in the body is ignored.
const ALLOWED = ['name', 'email', 'state', 'city', 'address_1', 'address_2', 'pincode', 'pancard', 'gst_no'];

export async function POST(request) {
    try {
        const body = await request.json();
        const mobile = normalizeMobile(body.telephone);
        if (mobile.length !== 10) {
            return NextResponse.json({ success: false, message: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
        }

        const limit = rateLimit(`register:ip:${await clientIp()}`, 10, 60 * 60 * 1000);
        if (!limit.ok) {
            return NextResponse.json({ success: false, message: 'Too many attempts. Please try again later.' }, { status: 429 });
        }

        const userData = Object.fromEntries(ALLOWED.map((k) => [k, String(body[k] ?? '').trim()]));
        const payload = await phpPost('customer_register.php', {
            ...userData,
            telephone: mobile,
            password: 'N/A',
            create_date: new Date().toISOString().split('T')[0],
            customer_group_id: 'Retailer',
            client_id: '1',
            createdBy: 'website',
        });

        if (!isTrue(payload) || Number(payload?.code) !== 200) {
            return NextResponse.json({ success: false, message: payload?.message || 'Registration failed. Please try again.' }, { status: 400 });
        }

        // A new account still has to prove it owns the number: send an OTP.
        const { next, challenge } = await startOtpChallenge(mobile);
        const response = NextResponse.json({ success: true, next });
        if (challenge) setOtpCookie(response, challenge);
        return response;
    } catch (error) {
        console.error('Register error:', error.response?.status || error.message);
        return NextResponse.json({ success: false, message: 'Registration failed. Please try again.' }, { status: 500 });
    }
}
