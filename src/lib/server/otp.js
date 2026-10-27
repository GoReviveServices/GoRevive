import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { phpPost, isTrue } from './php';
import { encryptToken, pickSessionUser, cookieOptions } from './session';

export const OTP_COOKIE = 'otp_challenge';
const OTP_TTL_SECONDS = 5 * 60;

const hashOtp = (mobile, otp) =>
    createHmac('sha256', process.env.JWT_SECRET).update(`${mobile}:${String(otp).trim()}`).digest('hex');

export const otpMatches = (mobile, otp, expectedHash) => {
    const a = Buffer.from(hashOtp(mobile, otp), 'hex');
    const b = Buffer.from(String(expectedHash || ''), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
};

const isDummyUser = (u) => u.cust_name === 'XYZ' || u.state === 'state' || u.pincode === '0';

/**
 * Asks PHP to send an OTP for this mobile number. The OTP and user record stay
 * on the server: they are ENCRYPTED into a short-lived httpOnly cookie that only
 * /api/auth/verify-otp can read. (Signing alone is not enough: anyone can type a
 * stranger's number into the login box and would then be able to decode that
 * customer's name, email, address and GST number from their own cookie.)
 * Returns { next: 'otp', challenge } or { next: 'register' }.
 */
export async function startOtpChallenge(mobile) {
    const payload = await phpPost('self_service_portal_login.php', { mobile_no: mobile });
    const user = isTrue(payload) && Array.isArray(payload?.data) ? payload.data[0] : null;

    if (!user || isDummyUser(user) || !user.otp || !user.crm_party_code) {
        return { next: 'register' };
    }

    const challenge = await encryptToken(
        {
            typ: 'otp',
            mobile,
            otp: hashOtp(mobile, user.otp),
            user: pickSessionUser({ ...user, mobile: user.mobile || mobile }),
        },
        `${OTP_TTL_SECONDS}s`
    );
    return { next: 'otp', challenge };
}

export const setOtpCookie = (response, challenge) =>
    response.cookies.set(OTP_COOKIE, challenge, cookieOptions(OTP_TTL_SECONDS));

export const normalizeMobile = (value) => String(value || '').replace(/\D/g, '').slice(-10);
