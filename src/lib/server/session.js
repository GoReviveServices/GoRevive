import 'server-only';
import { SignJWT, jwtVerify, EncryptJWT, jwtDecrypt } from 'jose';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'auth_token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const secret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    if (process.env.JWT_SECRET.length < 32) {
        console.warn('JWT_SECRET is shorter than 32 characters; use a longer random secret.');
    }
    return new TextEncoder().encode(process.env.JWT_SECRET);
};

const cookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
});

// Only these fields ever go into the session. Never sign client-supplied objects.
export const pickSessionUser = (u = {}) => ({
    crm_party_code: String(u.crm_party_code ?? ''),
    cust_name: u.cust_name ?? '',
    mobile: u.mobile ?? u.mobile_no ?? '',
    email: u.email ?? '',
    gst_no: u.gst_no ?? '',
    address1: u.address1 ?? '',
    address2: u.address2 ?? '',
    city: u.city ?? '',
    state: u.state ?? '',
    pincode: u.pincode ?? '',
    // Customer group from the PHP login record: decides Retailer vs Customer pricing.
    customer_group: String(u.customer_group_id ?? u.customer_group ?? u.user_type ?? u.cust_type ?? ''),
});

export async function signToken(payload, expiresIn) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secret());
}

export async function verifyToken(token) {
    const { payload } = await jwtVerify(token, secret());
    return payload;
}

// Encrypted (not just signed) tokens, for data the browser carries but must not be able to read.
// A signed JWT is only base64: anyone holding the cookie can decode it.
const encryptionKey = () =>
    createHash('sha256').update('gorevive:encrypted-token:').update(secret()).digest();

export async function encryptToken(payload, expiresIn) {
    return new EncryptJWT(payload)
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .encrypt(encryptionKey());
}

export async function decryptToken(token) {
    const { payload } = await jwtDecrypt(token, encryptionKey());
    return payload;
}

/** Issue the login session cookie on a response. */
export async function setSessionCookie(response, user) {
    const token = await signToken({ ...pickSessionUser(user), typ: 'session' }, '7d');
    response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
    return response;
}

/** Returns the signed-in user, or null. Use in route handlers and server components. */
export async function getSessionUser() {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
        const payload = await verifyToken(token);
        if (payload.typ !== 'session' || !payload.crm_party_code) return null;
        return payload;
    } catch {
        return null;
    }
}

// Groups that are charged Ret_Price. Everyone else (guests included) is charged Cust_Price.
const RETAILER_GROUPS = (process.env.RETAILER_GROUPS || 'Retailer')
    .split(',').map((g) => g.trim().toLowerCase()).filter(Boolean);

export const isRetailer = (user) =>
    Boolean(user) && RETAILER_GROUPS.includes(String(user.customer_group || '').trim().toLowerCase());

/** 'retailer' or 'customer' for the current request. */
export async function getPriceTier() {
    return isRetailer(await getSessionUser()) ? 'retailer' : 'customer';
}

export const unauthorized = () =>
    NextResponse.json({ success: false, message: 'Please log in.' }, { status: 401 });

export { SESSION_COOKIE, cookieOptions };
